const STORAGE_KEYS = {
  draft: "kfoodVisitorDraft",
  submissions: "kfoodVisitorSubmissions",
  completedStep1: "kfoodVisitorStep1Done",
  completedStep2: "kfoodVisitorStep2Done"
};

function buildRoute(page, hash) {
  const anchor = hash ? `#${hash}` : "";
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

function markCompleted(key) {
  localStorage.setItem(key, "true");
}

function isCompleted(key) {
  return localStorage.getItem(key) === "true";
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
  if (!input) {
    return;
  }

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
  const endpoint = window.APP_CONFIG && window.APP_CONFIG.submitUrl;
  if (!endpoint) {
    return { mode: "local" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      ...payload,
      userAgent: navigator.userAgent
    })
  });

  if (!response.ok) {
    throw new Error("HTTP error");
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.message || "Erro ao salvar");
  }

  return data;
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
  return normalizePhone(value).replace(/\+/g, "").length >= 10;
}

function getCheckedValue(form, name) {
  const checked = form.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function setCheckedValue(form, name, value) {
  if (!value) {
    return;
  }
  const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) {
    input.checked = true;
  }
}

function renderDraftSummary() {
  const draft = getDraft();
  document.querySelectorAll("[data-draft-name]").forEach((target) => {
    target.textContent = draft.name || "Nao informado";
  });
  document.querySelectorAll("[data-draft-phone]").forEach((target) => {
    target.textContent = draft.whatsapp || "Nao informado";
  });
}

function disableCompletedActions() {
  if (isCompleted(STORAGE_KEYS.completedStep1)) {
    document.querySelectorAll("[data-disable-after-step1]").forEach((element) => {
      element.disabled = true;
      element.classList.add("disabled-link");
      if (element.tagName === "BUTTON") {
        element.textContent = "Check-in já enviado";
      }
    });
  }

  if (isCompleted(STORAGE_KEYS.completedStep2)) {
    document.querySelectorAll("[data-disable-after-step2]").forEach((element) => {
      element.disabled = true;
      element.classList.add("disabled-link");
      if (element.tagName === "BUTTON") {
        element.textContent = "Pesquisa já enviada";
      }
    });
  }
}

function initModalCards() {
  const modal = document.querySelector("[data-modal]");
  if (!modal) {
    return;
  }

  const title = modal.querySelector("[data-modal-title]");
  const body = modal.querySelector("[data-modal-body]");
  const closeButton = modal.querySelector("[data-modal-close]");

  document.querySelectorAll("[data-modal-card]").forEach((card) => {
    card.addEventListener("click", () => {
      title.textContent = card.dataset.title || "";
      body.innerHTML = card.dataset.body || "";
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
    });
  });

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
}

function initStep1Form() {
  const form = document.querySelector("[data-step1-form]");
  if (!form) {
    return;
  }

  if (isCompleted(STORAGE_KEYS.completedStep1)) {
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonState(submitButton, true, "Check-in já enviado", "Check-in já enviado");
    setStatus(document.querySelector("[data-form-status]"), "Seu check-in já foi registrado neste aparelho.", false);
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
      source: "github-pages",
      lastStep: "step1"
    };

    if (!isValidName(payload.name)) {
      setStatus(status, "Digite seu nome completo.", true);
      return;
    }

    if (!isValidWhatsapp(payload.whatsapp)) {
      setStatus(status, "Digite um WhatsApp valido.", true);
      return;
    }

    setStatus(status, "Salvando seu check-in...", false);

    const merged = { ...getDraft(), ...payload };
    saveDraft(merged);
    upsertSubmission(merged);

    const submitButton = form.querySelector('button[type="submit"]');
    setButtonState(submitButton, true, "Continuar", "Salvando...");

    try {
      await submitToEndpoint({ step: "step1", ...merged });
      markCompleted(STORAGE_KEYS.completedStep1);
      document.querySelector("[data-step1-card]").classList.add("hidden");
      document.querySelector("[data-step1-next]").classList.remove("hidden");
      disableCompletedActions();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setButtonState(submitButton, false, "Continuar", "Salvando...");
      setStatus(status, "Falha ao enviar. Tente novamente.", true);
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

  if (isCompleted(STORAGE_KEYS.completedStep2)) {
    document.querySelector("[data-step2-card]").classList.add("hidden");
    document.querySelector("[data-thank-you]").classList.remove("hidden");
    disableCompletedActions();
    return;
  }

  renderDraftSummary();
  const status = document.querySelector("[data-step2-status]");

  if (draft.email) {
    form.elements.email.value = draft.email;
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

  setCheckedValue(form, "didTaste", draft.didTaste);
  setCheckedValue(form, "tastedZone", draft.tastedZone);
  setCheckedValue(form, "surveyFavorite", draft.surveyFavorite);
  setCheckedValue(form, "surveyReason", draft.surveyReason);
  setCheckedValue(form, "interest", draft.interest);
  setCheckedValue(form, "surveySatisfaction", draft.surveySatisfaction);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      ...draft,
      email: form.elements.email.value.trim(),
      didTaste: getCheckedValue(form, "didTaste"),
      tastedZone: getCheckedValue(form, "tastedZone"),
      surveyFavorite: getCheckedValue(form, "surveyFavorite"),
      surveyReason: getCheckedValue(form, "surveyReason"),
      interest: getCheckedValue(form, "interest"),
      surveyFutureInterest: getCheckedValue(form, "interest"),
      surveySatisfaction: getCheckedValue(form, "surveySatisfaction"),
      favoriteProduct: getCheckedValue(form, "surveyFavorite"),
      surveyComment: form.elements.notes.value.trim(),
      notes: form.elements.notes.value.trim(),
      privacyConsent: form.elements.privacyConsent.checked,
      marketingConsent: form.elements.marketingConsent.checked,
      surveyCompleted: true,
      giftEligible: form.elements.privacyConsent.checked && getCheckedValue(form, "didTaste") === "yes",
      step2Completed: true,
      lastStep: "step2"
    };

    if (!payload.privacyConsent) {
      setStatus(status, "Voce precisa concordar com o aviso de privacidade.", true);
      return;
    }

    if (!payload.surveyFavorite || !payload.interest || !payload.surveySatisfaction) {
      setStatus(status, "Responda as perguntas principais para continuar.", true);
      return;
    }

    setStatus(status, "Enviando sua pesquisa...", false);

    saveDraft(payload);
    upsertSubmission(payload);

    const submitButton = form.querySelector('button[type="submit"]');
    setButtonState(submitButton, true, "Enviar pesquisa", "Enviando...");

    try {
      await submitToEndpoint({ step: "step2", ...payload });
      markCompleted(STORAGE_KEYS.completedStep2);
      document.querySelector("[data-step2-card]").classList.add("hidden");
      document.querySelector("[data-thank-you]").classList.remove("hidden");
      renderDraftSummary();
      disableCompletedActions();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setButtonState(submitButton, false, "Enviar pesquisa", "Enviando...");
      setStatus(status, "Falha ao enviar. Tente novamente.", true);
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
    target.textContent = `${draft.name}, aproveite as degustacoes e as zonas do evento.`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initRouteLinks();
  renderDraftSummary();
  disableCompletedActions();
  initModalCards();
  initStep1Form();
  initStep2Form();
  initEventPage();
});
