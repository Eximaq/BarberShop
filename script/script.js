document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const header = document.querySelector(".site-header");
  const navLinks = document.querySelector(".nav-links");
  const menuToggle = document.querySelector(".menu-toggle");
  const navCloseButtons = document.querySelectorAll(".nav-close");
  const toast = document.getElementById("feedback-toast");
  const hero = document.querySelector(".hero");
  const heroImages = hero?.dataset.images ? JSON.parse(hero.dataset.images) : [];

  const setNavState = (isOpen) => {
    if (isOpen) {
      body.classList.add("nav-open");
    } else {
      body.classList.remove("nav-open");
    }
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.classList.toggle("active", isOpen);
    }
  };
  setNavState(false);

  const showToast = (message, type = "success") => {
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 3600);
  };

  const scrollToSection = (selector) => {
    const target = document.querySelector(selector);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  };

  const cycleHero = () => {
    if (!hero || heroImages.length === 0) return;
    let index = 0;
    hero.style.backgroundImage = `url(${heroImages[0]})`;
    setInterval(() => {
      index = (index + 1) % heroImages.length;
      hero.style.backgroundImage = `url(${heroImages[index]})`;
    }, 7000);
  };

  cycleHero();

  window.addEventListener("scroll", () => {
    header?.classList.toggle("scrolled", window.scrollY > 40);
  });

  document.querySelectorAll('a[href^="#"], [data-scroll]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href") || link.dataset.scroll;
      if (!href || !href.startsWith("#")) return;
      event.preventDefault();
      scrollToSection(href);
      setNavState(false);
    });
  });

  menuToggle?.addEventListener("click", () => {
    const willOpen = !body.classList.contains("nav-open");
    setNavState(willOpen);
  });

  navLinks?.addEventListener("click", (event) => {
    if (event.target.matches("a")) setNavState(false);
  });

  navCloseButtons.forEach((button) => {
    button.addEventListener("click", () => setNavState(false));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) setNavState(false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNavState(false);
  });

  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.1 }
  );
  reveals.forEach((section) => observer.observe(section));

  const supportsStorage = (() => {
    try {
      const testKey = "bpsTest";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch (err) {
      console.warn("Storage indisponível", err);
      return false;
    }
  })();

  const getStorage = (key, fallback) => {
    if (!supportsStorage) return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  };

  let appointments = getStorage("bpsAppointments", []);
  let users = getStorage("bpsUsers", {});
  let activeUser = supportsStorage ? localStorage.getItem("bpsActiveUser") : null;

  const persist = () => {
    if (!supportsStorage) return;
    localStorage.setItem("bpsAppointments", JSON.stringify(appointments));
    localStorage.setItem("bpsUsers", JSON.stringify(users));
    if (activeUser) {
      localStorage.setItem("bpsActiveUser", activeUser);
    } else {
      localStorage.removeItem("bpsActiveUser");
    }
  };

  const dashboardWelcome = document.getElementById("dashboard-welcome");
  const subscriptionStatus = document.getElementById("subscription-status");
  const historyList = document.getElementById("history-list");
  const nextAppointment = document.getElementById("next-appointment");

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const formatDateTime = (date, time) => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}`);
  };

  const updateNextAppointment = () => {
    if (!nextAppointment) return;
    if (!activeUser || !users[activeUser]) {
      nextAppointment.textContent = "Entre na conta para visualizar sua agenda.";
      return;
    }
    const upcoming = appointments
      .filter((item) => item.user === activeUser && item.status !== "Cancelado")
      .sort((a, b) => formatDateTime(a.date, a.time) - formatDateTime(b.date, b.time))[0];
    if (!upcoming) {
      nextAppointment.textContent = "Sem agendamentos futuros.";
      return;
    }
    nextAppointment.textContent = `${upcoming.service} em ${formatDate(upcoming.date)} às ${upcoming.time} com ${upcoming.professional}.`;
  };

  const renderHistory = () => {
    if (!historyList) return;
    historyList.innerHTML = "";
    if (!activeUser || !users[activeUser]) {
      historyList.innerHTML = '<li class="history-item">Faça login para visualizar seus agendamentos.</li>';
      return;
    }
    const items = appointments
      .filter((item) => item.user === activeUser)
      .sort((a, b) => formatDateTime(b.date, b.time) - formatDateTime(a.date, a.time));
    if (items.length === 0) {
      historyList.innerHTML = '<li class="history-item">Nenhum agendamento ainda. Utilize o botão Agendar.</li>';
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item";
      li.innerHTML = `
        <div><strong>${item.service}</strong> com ${item.professional}</div>
        <div>${formatDate(item.date)} às ${item.time}</div>
        <div><span class="badge ${item.status === "Cancelado" ? "badge-canceled" : "badge-confirmed"}">${item.status}</span></div>
        <div class="history-actions">
          <button class="btn btn-ghost" data-action="reschedule" data-id="${item.id}">Reagendar</button>
          <button class="btn btn-outline" data-action="cancel" data-id="${item.id}">Cancelar</button>
        </div>`;
      historyList.appendChild(li);
    });
  };

  const renderDashboard = () => {
    if (!dashboardWelcome || !subscriptionStatus) return;
    if (activeUser && users[activeUser]) {
      const { name, plan } = users[activeUser];
      dashboardWelcome.textContent = `Olá, ${name || "membro"}`;
      subscriptionStatus.textContent = plan ? `Plano ativo: ${plan}` : "Você ainda não ativou um plano. Escolha um para desbloquear vantagens.";
    } else {
      dashboardWelcome.textContent = "Bem-vindo à Barbearia Dom Miguel";
      subscriptionStatus.textContent = "Crie sua conta para visualizar planos e histórico.";
    }
    renderHistory();
    updateNextAppointment();
  };

  const ensureUserFromModal = (formData, mode) => {
    if (activeUser && users[activeUser]) return true;
    if (mode !== "modal") return false;
    const action = formData.get("clientAction") || "login";
    const email = formData.get("clientEmail");
       const password = formData.get("clientPassword");
    const name = formData.get("clientName") || "Cliente Dom Miguel";
    if (!email || !password) {
      showToast("Informe e-mail e senha para continuar.", "error");
      return false;
    }
    if (action === "register") {
      users[email] = { name, password, plan: null };
      activeUser = email;
      showToast("Conta criada com sucesso!", "success");
    } else {
      if (!users[email] || users[email].password !== password) {
        showToast("Credenciais inválidas.", "error");
        return false;
      }
      activeUser = email;
    }
    persist();
    renderDashboard();
    return true;
  };

  const bookingForms = document.querySelectorAll("[data-booking-form]");
  const bookingModal = document.getElementById("booking-modal");

  const submitBooking = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const service = formData.get("service");
    const professional = formData.get("professional");
    const date = formData.get("date");
    const time = formData.get("time");
    const notes = formData.get("notes") || "";

    if (!service || !professional || !date || !time) {
      showToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    if (!ensureUserFromModal(formData, form.dataset.mode)) {
      showToast("Faça login para concluir o agendamento.", "info");
      scrollToSection("#cliente");
      return;
    }

    const record = {
      id: form.dataset.editId || Date.now().toString(),
      user: activeUser,
      service,
      professional,
      date,
      time,
      notes,
      status: "Confirmado",
    };

    const existingIndex = appointments.findIndex((item) => item.id === record.id);
    if (existingIndex >= 0) {
      appointments[existingIndex] = record;
    } else {
      appointments.push(record);
    }

    persist();
    renderDashboard();
    showToast("Agendamento confirmado!", "success");
    form.reset();
    form.dataset.editId = "";
    if (form.closest(".modal")) closeModal(form.closest(".modal"));
  };

  bookingForms.forEach((form) => form.addEventListener("submit", submitBooking));

  const openModal = (selector) => {
    const modal = document.querySelector(selector);
    if (modal) {
      modal.classList.add("visible");
      modal.setAttribute("aria-hidden", "false");
    }
  };

  const closeModal = (modal) => {
    modal.classList.remove("visible");
    modal.setAttribute("aria-hidden", "true");
    const form = modal.querySelector("form");
    if (form) {
      form.reset();
      form.dataset.editId = "";
    }
  };

  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      openModal(button.dataset.openModal);
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(button.closest(".modal"));
    });
  });

  bookingModal?.addEventListener("click", (event) => {
    if (event.target === bookingModal) closeModal(bookingModal);
  });

  historyList?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment) return;
    if (action === "cancel") {
      appointment.status = "Cancelado";
      persist();
      renderDashboard();
      showToast("Agendamento cancelado.", "info");
    }
    if (action === "reschedule") {
      openModal("#booking-modal");
      const modalForm = document.getElementById("booking-modal-form");
      if (!modalForm) return;
      modalForm.service.value = appointment.service;
      modalForm.professional.value = appointment.professional;
      modalForm.date.value = appointment.date;
      modalForm.time.value = appointment.time;
      modalForm.notes.value = appointment.notes;
      modalForm.dataset.editId = appointment.id;
    }
  });

  const authForm = document.getElementById("auth-form");
  authForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(authForm);
    const action = formData.get("authAction");
    const email = formData.get("email");
    const password = formData.get("password");
    const name = formData.get("name") || "Cliente Dom Miguel";
    const planInterest = formData.get("planInterest");
    if (!email || !password) {
      showToast("Preencha e-mail e senha.", "error");
      return;
    }
    if (action === "register") {
      users[email] = { name, password, plan: planInterest || null };
      activeUser = email;
      showToast("Conta criada com sucesso!", "success");
    } else {
      if (!users[email] || users[email].password !== password) {
        showToast("E-mail ou senha incorretos.", "error");
        return;
      }
      activeUser = email;
      users[email].name = name;
      if (planInterest) users[email].plan = planInterest;
      showToast("Login realizado.", "success");
    }
    persist();
    authForm.reset();
    renderDashboard();
  });

  document.querySelectorAll('[data-plan]').forEach((button) => {
    button.addEventListener('click', () => {
      const planName = button.dataset.plan;
      if (activeUser && users[activeUser]) {
        users[activeUser].plan = planName;
        persist();
        renderDashboard();
        showToast(`Plano ${planName} ativado!`, 'success');
      } else {
        document.getElementById('plan-choice').value = planName;
        scrollToSection('#cliente');
        showToast('Faça login para concluir a assinatura.', 'info');
      }
    });
  });

  renderDashboard();
});
