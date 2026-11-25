import { pickCutsceneBackground } from '../story/story-loader.js?v=14';
import {
  bindHoverClearsKeyboardFocus,
  isKeyboardUiMode,
  onUiInputModeChange,
  setUiInputMode,
} from './input-mode.js?v=1';
import { WebModalController } from './web-modal.js?v=1';
import { openSqlChallenge } from '../sql/sql-console.js?v=7';

export class CutsceneController {
  constructor() {
    this.screen = document.getElementById('cutscene-screen');
    this.stageEl = this.screen.querySelector('.cutscene-stage');
    this.bgLabel = document.getElementById('cutscene-bg-label');
    this.leftImg = document.getElementById('cutscene-left-img');
    this.leftName = document.getElementById('cutscene-left-name');
    this.leftSlot = document.getElementById('cutscene-left-slot');
    this.rightImg = document.getElementById('cutscene-right-img');
    this.rightName = document.getElementById('cutscene-right-name');
    this.rightSlot = document.getElementById('cutscene-right-slot');
    this.speakerEl = document.getElementById('cutscene-speaker');
    this.textEl = document.getElementById('cutscene-text');
    this.choicesEl = document.getElementById('cutscene-choices');
    this.actionsEl = this.screen.querySelector('.cutscene-actions');
    this.linkBtn = document.getElementById('cutscene-link-btn');
    this.nextBtn = document.getElementById('cutscene-next-btn');
    this.webModal = new WebModalController();

    this.active = false;
    this.awaitingDelivery = false;
    this.cutscene = null;
    this.characters = null;
    this.stepIndex = 0;
    this.selectedChoiceIndex = 0;
    this.selectedActionIndex = 0;
    this.onFinish = null;
    this.onDeliverRequest = null;
    this.prevAction = false;
    this.prevUp = false;
    this.prevDown = false;
    this.prevLeft = false;
    this.prevRight = false;
    this.recentBackgroundsByType = new Map();

    this.linkBtn?.addEventListener('click', () => this.openStepLink());
    this.nextBtn.addEventListener('click', () => this.advance());
    bindHoverClearsKeyboardFocus(this.choicesEl, () => this.#syncChoiceSelection());
    bindHoverClearsKeyboardFocus(this.actionsEl, () => this.#syncActionSelection());
    onUiInputModeChange(() => {
      if (this.active) {
        this.#syncChoiceSelection();
        this.#syncActionSelection();
      }
    });
  }

  #matchesSpeaker(speaker, charId, charName) {
    const normalize = (val) =>
      String(val || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    const s = normalize(speaker);
    if (!s) return false;
    const idNorm = normalize(charId);
    const nameNorm = normalize(charName);
    if (s === idNorm || s === nameNorm) return true;
    const firstWord = nameNorm.split(/\s+/)[0];
    return Boolean(firstWord && s === firstWord);
  }

  #syncChoiceSelection() {
    if (!this.choicesEl) return;
    const buttons = [...this.choicesEl.querySelectorAll('.cutscene-choice-btn')];
    const showFocus = isKeyboardUiMode();
    buttons.forEach((btn, idx) => {
      btn.classList.toggle('selected', showFocus && idx === this.selectedChoiceIndex);
    });
  }

  #syncActionSelection() {
    const step = this.cutscene?.steps?.[this.stepIndex];
    const hasLink = Boolean(step?.link && !(step?.choices && step.choices.length > 0));
    if (!hasLink) {
      this.linkBtn?.classList.remove('selected');
      this.nextBtn?.classList.remove('selected');
      return;
    }
    const showFocus = isKeyboardUiMode();
    this.linkBtn?.classList.toggle('selected', showFocus && this.selectedActionIndex === 0);
    this.nextBtn?.classList.toggle('selected', showFocus && this.selectedActionIndex === 1);
  }

  play(cutscene, characters, onFinish, options = {}) {
    if (!cutscene || !cutscene.steps || cutscene.steps.length === 0) {
      onFinish?.({ outcome: 'complete', reason: '' });
      return;
    }

    this.active = true;
    this.awaitingDelivery = false;
    this.cutscene = cutscene;
    this.characters = characters;
    this.stepIndex = 0;
    this.selectedChoiceIndex = 0;
    this.selectedActionIndex = 0;
    this.onFinish = onFinish;
    this.onDeliverRequest = options.onDeliverRequest || null;
    this.prevAction = true;
    this.prevUp = false;
    this.prevDown = false;
    this.prevLeft = false;
    this.prevRight = false;

    let chosenBackgroundImage = cutscene.backgroundImage || '';
    if (Array.isArray(cutscene.backgroundPool) && cutscene.backgroundPool.length > 0) {
      const typeKey = cutscene.backgroundType || 'default';
      const recent = this.recentBackgroundsByType.get(typeKey) || [];
      const picked = pickCutsceneBackground(cutscene.backgroundPool, recent);
      if (picked.url) {
        chosenBackgroundImage = picked.url;
        this.recentBackgroundsByType.set(typeKey, picked.nextRecent);
      }
    }

    const rawBgText = String(cutscene.background || '').trim();
    const isFilePathBg = /\.(jpe?g|png|webp)$/i.test(rawBgText);
    if (isFilePathBg) {
      this.bgLabel.textContent = '';
      this.bgLabel.classList.add('hidden');
    } else {
      this.bgLabel.textContent = rawBgText || 'Escena lateral';
      this.bgLabel.classList.remove('hidden');
    }
    if (this.stageEl) {
      if (chosenBackgroundImage) {
        this.stageEl.style.backgroundImage = `linear-gradient(180deg, rgba(15, 23, 42, 0.16) 0%, rgba(15, 23, 42, 0.32) 62%, rgba(10, 14, 22, 0.78) 100%), url("${chosenBackgroundImage}")`;
        this.stageEl.classList.add('has-bg-image');
      } else {
        this.stageEl.style.backgroundImage = '';
        this.stageEl.classList.remove('has-bg-image');
      }
    }

    const leftChar = characters?.get(cutscene.leftChar);
    const rightChar = characters?.get(cutscene.rightChar);

    this.leftSlot.classList.remove('speaking');
    this.rightSlot.classList.remove('speaking');
    this.applyCharacterSlot(this.leftSlot, this.leftImg, this.leftName, leftChar, 'right');
    this.applyCharacterSlot(this.rightSlot, this.rightImg, this.rightName, rightChar, 'left');

    this.screen.classList.remove('hidden');
    // Garante reflow antes de aplicar .speaking para disparar a animação no 1º frame
    void this.screen.offsetWidth;
    this.renderStep();
  }

  applyCharacterSlot(slotEl, imgEl, nameEl, charDef, facingView) {
    if (!charDef) {
      slotEl.classList.add('hidden');
      return;
    }
    slotEl.classList.remove('hidden');
    nameEl.textContent = charDef.name;
    const src = charDef.sprites?.[facingView] || charDef.sprites?.front || '';
    if (src) {
      imgEl.src = src;
      imgEl.alt = charDef.name;
      imgEl.classList.remove('hidden');
    } else {
      imgEl.removeAttribute('src');
      imgEl.classList.add('hidden');
    }
  }

  renderStep() {
    const step = this.cutscene.steps[this.stepIndex];
    if (!step) {
      this.finish({ outcome: 'complete', reason: '' });
      return;
    }

    if (step.type === 'deliver') {
      if (typeof this.onDeliverRequest === 'function') {
        this.awaitingDelivery = true;
        this.onDeliverRequest(
          step.itemId,
          () => {
            this.awaitingDelivery = false;
            this.prevAction = true;
            this.stepIndex += 1;
            this.selectedChoiceIndex = 0;
            this.renderStep();
          },
          () => {
            this.awaitingDelivery = false;
            this.prevAction = true;
            this.stepIndex = Math.max(0, this.stepIndex - 1);
            this.renderStep();
          },
        );
        return;
      }
      this.stepIndex += 1;
      this.renderStep();
      return;
    }

    if (step.type === 'sql') {
      this.awaitingDelivery = true;
      openSqlChallenge(step.challengeId, {
        onSolved: () => {
          this.awaitingDelivery = false;
          this.prevAction = true;
          this.stepIndex += 1;
          this.selectedChoiceIndex = 0;
          this.renderStep();
        },
        onCancel: () => {
          this.awaitingDelivery = false;
          this.prevAction = true;
          this.stepIndex = Math.max(0, this.stepIndex - 1);
          this.renderStep();
        },
      });
      return;
    }

    this.speakerEl.textContent = step.speaker || '';
    this.textEl.textContent = step.text || '';

    const isLeftSpeaking = this.#matchesSpeaker(
      step.speaker,
      this.cutscene?.leftChar,
      this.leftName.textContent,
    );
    const isRightSpeaking = this.#matchesSpeaker(
      step.speaker,
      this.cutscene?.rightChar,
      this.rightName.textContent,
    );
    if (isLeftSpeaking && this.leftName.textContent) {
      this.speakerEl.textContent = this.leftName.textContent;
    } else if (isRightSpeaking && this.rightName.textContent) {
      this.speakerEl.textContent = this.rightName.textContent;
    }
    this.leftSlot.classList.toggle('speaking', isLeftSpeaking);
    this.rightSlot.classList.toggle('speaking', isRightSpeaking);

    this.choicesEl.replaceChildren();
    if (step.choices && step.choices.length > 0) {
      this.linkBtn?.classList.add('hidden');
      this.nextBtn.classList.add('hidden');
      this.choicesEl.classList.remove('hidden');
      this.selectedChoiceIndex = Math.min(this.selectedChoiceIndex, step.choices.length - 1);

      step.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cutscene-choice-btn';
        if (isKeyboardUiMode() && idx === this.selectedChoiceIndex) btn.classList.add('selected');
        btn.textContent = choice.label;
        btn.addEventListener('click', () => {
          this.#selectChoice(choice);
        });
        this.choicesEl.appendChild(btn);
      });
    } else {
      this.choicesEl.classList.add('hidden');
      this.nextBtn.classList.remove('hidden');
      this.nextBtn.textContent =
        this.stepIndex >= this.cutscene.steps.length - 1 ? 'Terminar escena' : 'Continuar';
      if (step.link) {
        if (this.linkBtn) {
          this.linkBtn.textContent = step.link.label;
          this.linkBtn.classList.remove('hidden');
        }
        this.selectedActionIndex = 0;
      } else {
        this.linkBtn?.classList.add('hidden');
        this.selectedActionIndex = 1;
      }
      this.#syncActionSelection();
    }
  }

  openStepLink() {
    if (!this.active || this.awaitingDelivery || this.webModal.active) return;
    const step = this.cutscene?.steps?.[this.stepIndex];
    if (!step?.link?.url) return;
    this.webModal.open(step.link.url, step.link.label, {
      onClose: () => {
        this.prevAction = true;
        this.prevLeft = false;
        this.prevRight = false;
        this.#syncActionSelection();
      },
    });
  }

  updateInput(inputState) {
    if (!this.active || this.awaitingDelivery) return;
    if (this.webModal.active) {
      this.webModal.updateInput(inputState);
      return;
    }
    const step = this.cutscene?.steps?.[this.stepIndex];
    if (!step) return;

    const up = Boolean(inputState.moveY < -0.5);
    const down = Boolean(inputState.moveY > 0.5);
    const left = Boolean(inputState.moveX < -0.5);
    const right = Boolean(inputState.moveX > 0.5);
    const action = Boolean(inputState.actionPressed ?? inputState.action);

    if (step.choices && step.choices.length > 0) {
      if (up && !this.prevUp) {
        setUiInputMode('keyboard');
        this.selectedChoiceIndex =
          (this.selectedChoiceIndex - 1 + step.choices.length) % step.choices.length;
        this.#syncChoiceSelection();
      }
      if (down && !this.prevDown) {
        setUiInputMode('keyboard');
        this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % step.choices.length;
        this.#syncChoiceSelection();
      }
      if (action && !this.prevAction) {
        const chosen = step.choices[this.selectedChoiceIndex];
        this.#selectChoice(chosen);
      }
    } else if (step.link) {
      if ((left && !this.prevLeft) || (up && !this.prevUp)) {
        setUiInputMode('keyboard');
        this.selectedActionIndex = 0;
        this.#syncActionSelection();
      }
      if ((right && !this.prevRight) || (down && !this.prevDown)) {
        setUiInputMode('keyboard');
        this.selectedActionIndex = 1;
        this.#syncActionSelection();
      }
      if (action && !this.prevAction) {
        if (this.selectedActionIndex === 0) {
          this.openStepLink();
        } else {
          this.advance();
        }
      }
    } else if (action && !this.prevAction) {
      this.advance();
    }

    this.prevAction = action;
    this.prevUp = up;
    this.prevDown = down;
    this.prevLeft = left;
    this.prevRight = right;
  }

  #selectChoice(choice) {
    if (!choice) return;
    if (choice.outcome === 'next') {
      if (this.stepIndex < this.cutscene.steps.length - 1) {
        this.stepIndex += 1;
        this.selectedChoiceIndex = 0;
        this.prevAction = true;
        this.renderStep();
      } else {
        this.finish({ outcome: 'complete', reason: '' });
      }
      return;
    }
    this.finish({ outcome: choice.outcome, reason: choice.reason || '' });
  }

  advance() {
    if (!this.active || this.awaitingDelivery) return;
    const step = this.cutscene.steps[this.stepIndex];
    if (step?.choices && step.choices.length > 0) return;

    if (this.stepIndex < this.cutscene.steps.length - 1) {
      this.stepIndex += 1;
      this.selectedChoiceIndex = 0;
      this.renderStep();
    } else {
      this.finish({ outcome: 'complete', reason: '' });
    }
  }

  finish(result) {
    this.webModal.close();
    this.active = false;
    this.screen.classList.add('hidden');
    const cb = this.onFinish;
    this.onFinish = null;
    cb?.(result);
  }
}
