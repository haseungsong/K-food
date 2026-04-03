const STORAGE_KEYS = {
  draft: "kfoodVisitorDraft",
  submissions: "kfoodVisitorSubmissions"
};

function isAppsScriptClient() {
  return !!(window.google && google.script && google.script.run);
}

function buildRoute(page, hash) {
  const anchor = hash ? `#${hash}` : "";
  if (isAppsScriptClient()) {
    return `${window.location.pathname}?page=${page}${anchor}`;
  }
  return `${page}.html${anchor}`;
}

function routeTo(page, hash) {
  window.location.href = buildRoute(page, hash);
}

function initRouteLinks() {
  document.querySelectorAll("[data-route]").forEach((link) => {
    const page = link.dataset.route;
    const hash = link.dataset.hash || "";
    link.setAttribute("href", buildRoute(page, hash));
  });
}

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function getDraft() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.draft), {});
}

function saveDraft(data) {
  localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(data));
}

function getSubmissions() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.submissions), []);
}

function saveSubmissions(items) {
  localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(items));
}

function getSafeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return String(Date.now());
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function formatPhoneInput(input) {
  input.addEventListener("input", () => {
    const raw = input.value.replace(/[^\d]/g, "").slice(0, 15);
    if (!raw) {
      input.value = "";
      return;
    }

    const groups = [];
    if (raw.length <= 2) {
      groups.push(raw);
    } else if (raw.length <= 7) {
      groups.push(raw.slice(0, 2), raw.slice(2));
    } else if (raw.length <= 11) {
      groups.push(raw.slice(0, 2), raw.slice(2, 7), raw.slice(7));
    } else {
      groups.push(raw.slice(0, 2), raw.slice(2, 7), raw.slice(7, 11), raw.slice(11));
    }
    input.value = groups.join(" ");
  });
}

function upsertSubmission(payload) {
  const items = getSubmissions();
  const phone = normalizePhone(payload.whatsapp);
  const index = items.findIndex((item) => normalizePhone(item.whatsapp) === phone);

  if (index >= 0) {
    items[index] = { ...items[index], ...payload, updatedAt: new Date().toISOString() };
  } else {
    items.unshift({
      id: getSafeId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...payload
    });
  }

  saveSubmissions(items);
}

async function submitToEndpoint(payload) {
  if (isAppsScriptClient()) {
    const enrichedPayload = {
      ...payload,
      userAgent: navigator.userAgent
    };

    return new Promise((resolve, reject) => {
      const runner = google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => {
          reject(new Error(error && error.message ? error.message : "Apps Script error"));
        });

      if (payload.step === "step1") {
        runner.saveStep1(enrichedPayload);
        return;
      }

      if (payload.step === "step2") {
        runner.saveStep2(enrichedPayload);
        return;
      }

      resolve({ mode: "local" });
    });
  }

  const endpoint = window.APP_CONFIG && window.APP_CONFIG.submitUrl;
  if (!endpoint) {
    return { mode: "local" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("서버 저장 실패");
  }

  return response.json().catch(() => ({ mode: "remote" }));
}

function setStatus(target, message, isError) {
  if (!target) {
    return;
  }
  target.textContent = message || "";
  target.style.color = isError ? "var(--danger)" : "var(--secondary)";
}

function setButtonState(button, isLoading, idleText, loadingText) {
  if (!button) {
    return;
  }
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
}

function isValidName(value) {
  return value.trim().length >= 2;
}

function isValidWhatsapp(value) {
  const digits = normalizePhone(value).replace(/\+/g, "");
  return digits.length >= 10;
}

function renderDraftSummary() {
  const draft = getDraft();
  const nameTargets = document.querySelectorAll("[data-draft-name]");
  const phoneTargets = document.querySelectorAll("[data-draft-phone]");

  nameTargets.forEach((target) => {
    target.textContent = draft.name || "Ainda nao informado / 아직 등록되지 않음";
  });
  phoneTargets.forEach((target) => {
    target.textContent = draft.whatsapp || "Ainda nao informado / 아직 등록되지 않음";
  });
}

function initStep1Form() {
  const form = document.querySelector("[data-step1-form]");
  if (!form) {
    return;
  }

  const phoneInput = form.querySelector('input[name="whatsapp"]');
  const status = document.querySelector("[data-form-status]");
  formatPhoneInput(phoneInput);

  const draft = getDraft();
  if (draft.name) {
    form.elements.name.value = draft.name;
  }
  if (draft.whatsapp) {
    form.elements.whatsapp.value = draft.whatsapp;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: form.elements.name.value.trim(),
      whatsapp: form.elements.whatsapp.value.trim(),
      step1Completed: true,
      source: "qr-landing"
    };

    if (!isValidName(payload.name)) {
      setStatus(status, "Digite seu nome completo. / 이름을 2글자 이상 입력해 주세요.", true);
      return;
    }
    if (!isValidWhatsapp(payload.whatsapp)) {
      setStatus(status, "Digite um WhatsApp valido. / 올바른 WhatsApp 번호를 입력해 주세요.", true);
      return;
    }

    setStatus(status, "Salvando seu check-in... / 체크인 정보를 저장하고 있습니다.", false);

    const merged = { ...getDraft(), ...payload };
    saveDraft(merged);
    upsertSubmission(merged);

    const submitButton = form.querySelector('button[type="submit"]');
    setButtonState(
      submitButton,
      true,
      "Continuar para proxima etapa / 다음 단계로 계속",
      "Salvando... / 저장 중..."
    );

    try {
      await submitToEndpoint({ step: "step1", ...merged });
      routeTo("step2");
    } catch (error) {
      setButtonState(
        submitButton,
        false,
        "Continuar para proxima etapa / 다음 단계로 계속",
        "Salvando... / 저장 중..."
      );
      setStatus(
        status,
        "Salvo no dispositivo, mas houve falha na conexao com o servidor. / 기기에는 저장되었지만 서버 연결에 실패했습니다.",
        true
      );
    }
  });
}

function initStep2Form() {
  const form = document.querySelector("[data-step2-form]");
  if (!form) {
    return;
  }

  const draft = getDraft();
  if (!draft.name || !draft.whatsapp) {
    routeTo("step1");
    return;
  }

  renderDraftSummary();
  const status = document.querySelector("[data-step2-status]");

  if (draft.email) {
    form.elements.email.value = draft.email;
  }
  if (draft.interest) {
    form.elements.interest.value = draft.interest;
  }
  if (draft.didTaste) {
    form.elements.didTaste.value = draft.didTaste;
  }
  if (draft.tastedZone) {
    form.elements.tastedZone.value = draft.tastedZone;
  }
  if (draft.surveyFavorite) {
    form.elements.surveyFavorite.value = draft.surveyFavorite;
  }
  if (draft.surveyReason) {
    form.elements.surveyReason.value = draft.surveyReason;
  }
  if (draft.surveySatisfaction) {
    form.elements.surveySatisfaction.value = draft.surveySatisfaction;
  }
  if (draft.notes) {
    form.elements.notes.value = draft.notes;
  }
  if (draft.marketingConsent) {
    form.elements.marketingConsent.checked = true;
  }
  if (draft.privacyConsent) {
    form.elements.privacyConsent.checked = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      ...draft,
      email: form.elements.email.value.trim(),
      interest: form.elements.interest.value,
      didTaste: form.elements.didTaste.value,
      tastedZone: form.elements.tastedZone.value,
      surveyFavorite: form.elements.surveyFavorite.value,
      surveyReason: form.elements.surveyReason.value,
      surveySatisfaction: form.elements.surveySatisfaction.value,
      favoriteProduct: form.elements.surveyFavorite.value,
      surveyFutureInterest: form.elements.interest.value,
      surveyComment: form.elements.notes.value.trim(),
      notes: form.elements.notes.value.trim(),
      privacyConsent: form.elements.privacyConsent.checked,
      marketingConsent: form.elements.marketingConsent.checked,
      surveyCompleted: true,
      giftEligible: form.elements.privacyConsent.checked && form.elements.didTaste.value === "yes",
      step2Completed: true
    };

    if (!payload.privacyConsent) {
      setStatus(
        status,
        "Voce precisa concordar com o aviso de privacidade para concluir. / 완료하려면 개인정보 안내 동의가 필요합니다.",
        true
      );
      return;
    }
    if (!payload.surveyFavorite || !payload.interest || !payload.surveySatisfaction) {
      setStatus(
        status,
        "Responda as perguntas principais da pesquisa para participar. / 경품 응모를 위해 핵심 설문 문항을 입력해 주세요.",
        true
      );
      return;
    }

    setStatus(status, "Concluindo seu cadastro... / 등록을 완료하고 있습니다.", false);
    saveDraft(payload);
    upsertSubmission(payload);

    const submitButton = form.querySelector('button[type="submit"]');
    setButtonState(
      submitButton,
      true,
      "Concluir cadastro / 등록 완료하기",
      "Enviando... / 전송 중..."
    );

    try {
      await submitToEndpoint({ step: "step2", ...payload });
      document.querySelector("[data-step2-card]").classList.add("hidden");
      document.querySelector("[data-thank-you]").classList.remove("hidden");
      renderDraftSummary();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setButtonState(
        submitButton,
        false,
        "Concluir cadastro / 등록 완료하기",
        "Enviando... / 전송 중..."
      );
      setStatus(
        status,
        "Salvo no dispositivo, mas houve falha na conexao com o servidor. / 기기에는 저장되었지만 서버 연결에 실패했습니다.",
        true
      );
    }
  });
}

function initEventPage() {
  const target = document.querySelector("[data-visitor-message]");
  if (!target) {
    return;
  }

  const draft = getDraft();
  if (draft.name) {
    target.textContent = `${draft.name}, se voce ja concluiu o check-in, veja abaixo as zonas e degustacoes. / ${draft.name}님, 체크인을 마치셨다면 아래 존 안내와 시식 정보를 확인해 보세요.`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initRouteLinks();
  renderDraftSummary();
  initStep1Form();
  initStep2Form();
  initEventPage();
});
