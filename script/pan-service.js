const firebaseConfig = {
  apiKey: "AIzaSyDZ-NvSzXJrH8YyvI5GWVWRtZnSNe0NAxU",
  authDomain: "tech-source-bill.firebaseapp.com",
  databaseURL: "https://tech-source-bill-default-rtdb.firebaseio.com",
  projectId: "tech-source-bill",
  storageBucket: "tech-source-bill.firebasestorage.app",
  messagingSenderId: "690209240188",
  appId: "1:690209240188:web:6e54de365e7f839634c5f9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let formData = {};
let currentUser = null;
let currentProfile = {};
let authMode = "login";
let currentStepIndex = 0;
let isMinorApplicant = false;
let draftSaveTimer = null;

const draftFieldIds = [
  "lastName", "firstName", "middleName", "aadhar", "nameAadhar", "dob", "gender",
  "phone", "email", "fatherlastName", "fatherFirstName", "fatherMiddleName",
  "motherlastName", "motherfirstName", "motherMiddleName", "guardianlastName",
  "guardianfirstName", "guardianMiddleName", "pinCode", "flatNo", "villageCity",
  "postOffice", "manualPO", "subDivision", "district", "state", "proofOfIdentity",
  "proofOfAddress", "proof_dob"
];

const adultSteps = [
  { id: "basic", label: "Basic Detail" },
  { id: "contact", label: "Contact Detail" },
  { id: "parents", label: "Parents Detail" },
  { id: "address", label: "Address Detail" },
  { id: "documents", label: "Documents" }
];

const minorSteps = [
  { id: "basic", label: "Basic Detail" },
  { id: "contact", label: "Contact Detail" },
  { id: "parents", label: "Parents Detail" },
  { id: "guardian", label: "Guardian Detail" },
  { id: "address", label: "Address Detail" },
  { id: "documents", label: "Documents" }
];

function getSteps() {
  return isMinorApplicant ? minorSteps : adultSteps;
}

function redirectToLogin() {
  window.location.href = "login.html?next=pan-service.html";
}

function openForm() {
  if (!currentUser) {
    redirectToLogin();
    return;
  }

  const screen = document.getElementById("formScreen");
  const emailInput = document.getElementById("email");

  if (!emailInput.value) emailInput.value = currentUser.email || "";

  screen.style.display = "block";
  screen.classList.add("is-open");
  screen.setAttribute("aria-hidden", "false");
  loadDraft();
  renderSteps();
}

function closeForm() {
  saveDraft();
  const screen = document.getElementById("formScreen");
  screen.style.display = "none";
  screen.classList.remove("is-open");
  screen.setAttribute("aria-hidden", "true");
}

function renderSteps() {
  const steps = getSteps();
  const stepper = document.getElementById("formStepper");
  const progressText = document.getElementById("stepProgressText");
  const prevBtn = document.getElementById("prevStepBtn");
  const nextBtn = document.getElementById("nextStepBtn");
  const submitBtn = document.getElementById("submitStepBtn");
  const minorBadge = document.getElementById("minorBadge");

  if (currentStepIndex >= steps.length) currentStepIndex = steps.length - 1;
  if (currentStepIndex < 0) currentStepIndex = 0;

  stepper.classList.toggle("minor-mode", isMinorApplicant);
  stepper.innerHTML = steps.map((step, index) => {
    const state = index === currentStepIndex ? "is-active" : index < currentStepIndex ? "is-done" : "";
    return `<span class="step-pill ${state}" data-number="${index + 1}">${step.label}</span>`;
  }).join("");

  document.querySelectorAll(".form-section").forEach((section) => {
    const isActive = section.dataset.step === steps[currentStepIndex].id;
    section.classList.toggle("is-active", isActive);

    section.querySelectorAll("input, select, button, textarea").forEach((field) => {
      field.disabled = !isActive;
    });
  });

  if (isMinorApplicant) {
    document.getElementById("guardianSection").classList.remove("hidden-section");
    document.getElementById("guardianFields").classList.remove("hidden-section");
    document.getElementById("gFrontBox").classList.remove("hidden-section");
    document.getElementById("gBackBox").classList.remove("hidden-section");
  } else {
    document.getElementById("guardianSection").classList.add("hidden-section");
    document.getElementById("guardianFields").classList.add("hidden-section");
    document.getElementById("gFrontBox").classList.add("hidden-section");
    document.getElementById("gBackBox").classList.add("hidden-section");
  }

  minorBadge.classList.toggle("is-visible", isMinorApplicant);
  progressText.textContent = `Step ${currentStepIndex + 1} of ${steps.length}`;
  prevBtn.style.display = currentStepIndex === 0 ? "none" : "inline-flex";
  nextBtn.style.display = currentStepIndex === steps.length - 1 ? "none" : "inline-flex";
  submitBtn.style.display = currentStepIndex === steps.length - 1 ? "inline-flex" : "none";
}

function validateCurrentStep() {
  const currentStep = getSteps()[currentStepIndex].id;
  const sections = document.querySelectorAll(`.form-section[data-step="${currentStep}"]`);

  for (const section of sections) {
    const fields = section.querySelectorAll("input, select, textarea");
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
  }

  return true;
}

function goNextStep() {
  if (!validateCurrentStep()) return;
  currentStepIndex++;
  renderSteps();
  saveDraft(true);
}

function goPrevStep() {
  currentStepIndex--;
  renderSteps();
  saveDraft(true);
}

function openAuthPopup(mode = "login") {
  redirectToLogin();
  return;
  authMode = mode;
  document.getElementById("authTitle").innerText = mode === "signup" ? "Create Account" : "Login";
  document.getElementById("authSubmitBtn").innerText = mode === "signup" ? "Create Account" : "Login";
  document.getElementById("authSwitchBtn").innerText = mode === "signup" ? "Already have an account? Login" : "Create new account";
  document.getElementById("authName").parentElement.style.display = mode === "signup" ? "flex" : "none";
  document.getElementById("authMsg").innerText = "";
  openPopup("authPopup");
}

function closeAuthPopup() {
  closePopup("authPopup");
  document.getElementById("authName").value = "";
  document.getElementById("authEmail").value = "";
  document.getElementById("authPassword").value = "";
  document.getElementById("authMsg").innerText = "";
}

async function handleAuthSubmit() {
  const name = document.getElementById("authName").value.trim();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const msg = document.getElementById("authMsg");
  const btn = document.getElementById("authSubmitBtn");

  msg.innerText = "";

  if (!email || !password) {
    msg.innerText = "Email aur password required hai.";
    return;
  }

  if (authMode === "signup" && !name) {
    msg.innerText = "Full name required hai.";
    return;
  }

  try {
    btn.disabled = true;
    btn.innerText = "Please wait...";

    if (authMode === "signup") {
      const result = await auth.createUserWithEmailAndPassword(email, password);
      await result.user.updateProfile({ displayName: name });
      await db.collection("users").doc(result.user.uid).set({
        name,
        email,
        phone: "",
        mobile: "",
        city: "",
        address: "",
        photoUrl: "",
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }

    closeAuthPopup();
  } catch (err) {
    msg.innerText = err.message || err;
  } finally {
    btn.disabled = false;
    btn.innerText = authMode === "signup" ? "Create Account" : "Login";
  }
}

function logoutUser() {
  auth.signOut();
}

function getAvatarUrl(user, profile = {}) {
  if (profile.photoUrl) return profile.photoUrl;
  if (user?.photoURL) return user.photoURL;
  const name = encodeURIComponent(profile.name || user?.displayName || "TS");
  return `https://ui-avatars.com/api/?name=${name}&background=0f766e&color=fff`;
}

async function getUserProfile(user) {
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();

  if (snap.exists) return snap.data();

  const profile = {
    name: user.displayName || "",
    email: user.email || "",
    phone: "",
    mobile: "",
    city: "",
    address: "",
    photoUrl: user.photoURL || "",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await ref.set(profile, { merge: true });
  return profile;
}

function updateAuthUI() {
  const loginBtn = document.getElementById("loginOpenBtn");
  const userChip = document.getElementById("userChip");
  const displayName = currentProfile.name || currentUser?.displayName || "User";
  const displayEmail = currentUser?.email || "";
  const avatar = getAvatarUrl(currentUser, currentProfile);

  if (!currentUser) {
    loginBtn.style.display = "inline-flex";
    userChip.classList.remove("is-visible");
    document.getElementById("profileSummaryName").innerText = "Login required";
    document.getElementById("profileSummaryEmail").innerText = "Login karke apni PAN application history dekhein.";
    document.getElementById("profileSummaryPhoto").src = getAvatarUrl(null, { name: "TS" });
    document.getElementById("historyGrid").innerHTML = '<div class="empty-history">Login karne ke baad history yahan show hogi.</div>';
    return;
  }

  loginBtn.style.display = "none";
  userChip.classList.add("is-visible");
  document.getElementById("userChipName").innerText = displayName;
  document.getElementById("userChipEmail").innerText = displayEmail;
  document.getElementById("userChipPhoto").src = avatar;
  document.getElementById("profileSummaryName").innerText = displayName;
  document.getElementById("profileSummaryEmail").innerText = displayEmail;
  document.getElementById("profileSummaryPhoto").src = avatar;
}

function openProfilePopup() {
  if (!currentUser) {
    redirectToLogin();
    return;
  }

  const avatar = getAvatarUrl(currentUser, currentProfile);
  document.getElementById("profilePreview").src = avatar;
  document.getElementById("profileName").value = currentProfile.name || currentUser.displayName || "";
  document.getElementById("profileEmail").value = currentUser.email || "";
  document.getElementById("profilePhone").value = currentProfile.phone || currentProfile.mobile || "";
  document.getElementById("profileCity").value = currentProfile.city || "";
  document.getElementById("profileAddress").value = currentProfile.address || "";
  document.getElementById("profilePhoto").value = "";
  document.getElementById("profileMsg").innerText = "";
  openPopup("profilePopup");
}

function closeProfilePopup() {
  closePopup("profilePopup");
}

function openAccountPopup() {
  if (!currentUser) {
    redirectToLogin();
    return;
  }

  updateAuthUI();
  loadApplicationHistory();
  openPopup("accountPopup");
}

function closeAccountPopup() {
  closePopup("accountPopup");
}

async function saveProfile() {
  if (!currentUser) return;

  const msg = document.getElementById("profileMsg");
  const file = document.getElementById("profilePhoto").files[0];
  const profile = {
    name: document.getElementById("profileName").value.trim(),
    email: currentUser.email,
    phone: document.getElementById("profilePhone").value.trim(),
    mobile: document.getElementById("profilePhone").value.trim(),
    city: document.getElementById("profileCity").value.trim(),
    address: document.getElementById("profileAddress").value.trim(),
    updatedAt: new Date()
  };

  try {
    msg.style.color = "";
    msg.innerText = "Saving...";

    if (file) {
      profile.photoUrl = await uploadToCloudinary(file);
    } else {
      profile.photoUrl = currentProfile.photoUrl || currentUser.photoURL || "";
    }

    await db.collection("users").doc(currentUser.uid).set(profile, { merge: true });
    await currentUser.updateProfile({
      displayName: profile.name,
      photoURL: profile.photoUrl
    });

    currentProfile = { ...currentProfile, ...profile };
    updateAuthUI();
    msg.style.color = "green";
    msg.innerText = "Profile updated.";

    setTimeout(closeProfilePopup, 800);
  } catch (err) {
    msg.style.color = "red";
    msg.innerText = "Error: " + (err.message || err);
  }
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsArg(value) {
  return escapeHtml(JSON.stringify(String(value ?? "")));
}

function showToast(message, type = "success") {
  let stack = document.getElementById("toastStack");

  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa ${type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}"></i><span>${escapeHtml(message)}</span>`;
  stack.appendChild(toast);

  setTimeout(() => toast.classList.add("is-visible"), 20);
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function getDraftKey() {
  const owner = currentUser?.uid || currentUser?.email || "guest";
  return `panFormDraft:${owner}`;
}

function collectDraftData() {
  const data = {};

  draftFieldIds.forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;
    data[id] = field.value;
  });

  return {
    values: data,
    currentStepIndex,
    isMinorApplicant,
    savedAt: Date.now()
  };
}

function saveDraft(silent = true) {
  if (!currentUser) return;
  localStorage.setItem(getDraftKey(), JSON.stringify(collectDraftData()));
  if (!silent) showToast("Draft saved");
}

function clearDraft() {
  if (!currentUser) return;
  localStorage.removeItem(getDraftKey());
}

function scheduleDraftSave() {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => saveDraft(true), 500);
}

function loadDraft() {
  if (!currentUser) return;

  const raw = localStorage.getItem(getDraftKey());
  if (!raw) return;

  try {
    const draft = JSON.parse(raw);
    Object.entries(draft.values || {}).forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field && field.type !== "file") field.value = value || "";
    });

    isMinorApplicant = Boolean(draft.isMinorApplicant);
    currentStepIndex = Number.isInteger(draft.currentStepIndex) ? draft.currentStepIndex : 0;
    updateAadhaarName();
    showToast("Saved draft restored");
  } catch (err) {
    localStorage.removeItem(getDraftKey());
  }
}

function getStatusClass(status) {
  const normalized = (status || "pending").toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "under process") return "under-process";
  return "pending";
}

function getPaymentInfo(paymentStatus) {
  const paid = paymentStatus === "paid";
  return {
    text: paid ? "Paid" : "Pending",
    className: paid ? "paid" : "pending"
  };
}

function getTimelineSteps(data) {
  const paymentPaid = data.paymentStatus === "paid";
  const status = (data.status || "pending").toLowerCase();
  const approved = status === "approved";
  const rejected = status === "rejected";
  const underProcess = status === "under process" || approved || rejected;

  return [
    { label: "Submitted", state: "done" },
    { label: paymentPaid ? "Payment Paid" : "Payment Pending", state: paymentPaid ? "done" : "active" },
    { label: "Under Process", state: underProcess ? "done" : "pending" },
    {
      label: rejected ? "Rejected" : approved ? "Approved" : "Final Status",
      state: rejected ? "rejected" : approved ? "done" : "pending"
    }
  ];
}

function renderTimeline(data) {
  return `
    <div class="status-timeline">
      ${getTimelineSteps(data).map((step) => `
        <div class="timeline-step ${step.state}">
          <span></span>
          <strong>${escapeHtml(step.label)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderStatusDetails(data) {
  const status = data.status || "pending";
  const payment = getPaymentInfo(data.paymentStatus);
  const remark = data.remark && data.remark.trim() !== "" ? data.remark : "No remark";

  return `
    <div class="status-panel">
      <div class="status-panel-head">
        <div>
          <span class="history-label">Application Status</span>
          <h4>${escapeHtml(data.name || "PAN Application")}</h4>
          <p>${escapeHtml(data.ackNo || "N/A")}</p>
        </div>
        <span class="status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span>
      </div>
      ${renderTimeline(data)}
      <div class="status-list">
        <div class="status-row">
          <small>Payment</small>
          <strong><span class="payment-badge ${payment.className === "paid" ? "paid" : ""}">${payment.text}</span></strong>
        </div>
        <div class="status-row">
          <small>Applied On</small>
          <strong>${escapeHtml(formatDate(data.createdAt))}</strong>
        </div>
        <div class="status-row">
          <small>Applicant Type</small>
          <strong>${data.isMinor ? "Minor PAN" : "PAN"}</strong>
        </div>
        <div class="status-row status-row-wide">
          <small>Remark</small>
          <strong>${escapeHtml(remark)}</strong>
        </div>
      </div>
    </div>
  `;
}

function copyAck(ackNo) {
  if (!ackNo) return;
  navigator.clipboard.writeText(ackNo)
    .then(() => showToast("ACK copied: " + ackNo))
    .catch(() => {
      prompt("Copy ACK No:", ackNo);
    });
}

function showHistoryStatus(ackNo) {
  closeAccountPopup();
  document.getElementById("trackDetails").innerHTML = '<div class="status-panel">Loading...</div>';
  openPopup("trackPopup");

  db.collection("applications")
    .where("ackNo", "==", ackNo)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        document.getElementById("trackDetails").innerHTML = "Record not found";
        return;
      }

      const data = snapshot.docs[0].data();
      const payBtn = document.getElementById("payBtn");
      document.getElementById("trackDetails").innerHTML = renderStatusDetails(data);

      payBtn.style.display = data.paymentStatus === "paid" ? "none" : "block";
      payBtn.onclick = function () {
        window.location.href = "payment.html?ack=" + data.ackNo;
      };
    })
    .catch((err) => {
      document.getElementById("trackDetails").innerHTML = "Error: " + err.message;
    });
}

function goHistoryPayment(ackNo, paymentStatus) {
  if (!ackNo) return;
  if (paymentStatus === "paid") {
    showHistoryStatus(ackNo);
    return;
  }
  window.location.href = "payment.html?ack=" + ackNo;
}

async function loadApplicationHistory() {
  const grid = document.getElementById("historyGrid");

  if (!currentUser) {
    grid.innerHTML = '<div class="empty-history">Login karne ke baad history yahan show hogi.</div>';
    redirectToLogin();
    return;
  }

  grid.innerHTML = '<div class="empty-history">Loading history...</div>';

  try {
    const userSnapshot = await db.collection("applications")
      .where("userId", "==", currentUser.uid)
      .get();
    const emailSnapshot = await db.collection("applications")
      .where("email", "==", currentUser.email)
      .get();

    const appMap = new Map();
    userSnapshot.forEach((doc) => appMap.set(doc.id, { id: doc.id, ...doc.data() }));
    emailSnapshot.forEach((doc) => appMap.set(doc.id, { id: doc.id, ...doc.data() }));

    if (appMap.size === 0) {
      grid.innerHTML = `
        <div class="empty-history">
          <div class="empty-history-content">
            <i class="fa fa-folder-open"></i>
            <h3>No PAN history yet</h3>
            <p>Abhi tak is account se koi PAN apply nahi hua.</p>
            <button class="btn" type="button" onclick="closeAccountPopup(); openForm();">Apply New PAN</button>
          </div>
        </div>
      `;
      return;
    }

    const apps = Array.from(appMap.values())
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });

    grid.innerHTML = apps.map((app) => {
      const status = app.status || "pending";
      const payment = getPaymentInfo(app.paymentStatus);
      const ackNo = app.ackNo || "";
      const applicantName = app.name || "PAN Application";
      const appliedDate = formatDate(app.createdAt);
      const pendingPayment = app.paymentStatus !== "paid";
      return `
        <article class="history-card ${pendingPayment ? "payment-pending-card" : ""}">
          <div class="history-card-head">
            <div>
              <span class="history-label">Applicant</span>
              <h3>${escapeHtml(applicantName)}</h3>
              <p class="ack-line">ACK: ${escapeHtml(ackNo || "N/A")}</p>
            </div>
            <span class="status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span>
          </div>
          <div class="history-details">
            <div class="history-detail">
              <small>DOB</small>
              <strong>${escapeHtml(app.dob || "N/A")}</strong>
            </div>
            <div class="history-detail">
              <small>Applied</small>
              <strong>${escapeHtml(appliedDate)}</strong>
            </div>
            <div class="history-detail">
              <small>Payment</small>
              <strong><span class="payment-badge ${payment.className === "paid" ? "paid" : ""}">${payment.text}</span></strong>
            </div>
            <div class="history-detail">
              <small>Type</small>
              <strong>${app.isMinor ? "Minor PAN" : "PAN"}</strong>
            </div>
          </div>
          <div class="history-actions">
            <button class="mini-btn" type="button" onclick="copyAck(${jsArg(ackNo)})"><i class="fa fa-copy"></i> Copy ACK</button>
            <button class="mini-btn" type="button" onclick="downloadHistoryReceipt(${jsArg(ackNo)})"><i class="fa fa-file-pdf"></i> Receipt</button>
            <button class="mini-btn" type="button" onclick="showHistoryStatus(${jsArg(ackNo)})"><i class="fa fa-circle-info"></i> Status</button>
            <button class="mini-btn ${pendingPayment ? "warn" : "primary"}" type="button" onclick="goHistoryPayment(${jsArg(ackNo)}, ${jsArg(app.paymentStatus || "")})"><i class="fa ${app.paymentStatus === "paid" ? "fa-eye" : "fa-credit-card"}"></i> ${app.paymentStatus === "paid" ? "View" : "Pay Now"}</button>
          </div>
        </article>
      `;
    }).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-history">History load nahi hui: ${err.message || err}</div>`;
  }
}

async function uploadToCloudinary(file) {
  if (!file) throw "File missing";

  const url = "https://api.cloudinary.com/v1_1/dsnuatuc8/image/upload";
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "ml_default");
  fd.append("folder", "pan_applications");

  try {
    const res = await fetch(url, {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    console.log("Cloudinary FULL:", data);

    if (!res.ok) throw data.error?.message || "Upload failed (Bad Request)";
    if (!data.secure_url) throw "Upload failed";

    return data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
  } catch (err) {
    console.error("Upload Error:", err);
    throw err;
  }
}

document.getElementById("newpanForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  if (currentStepIndex !== getSteps().length - 1) {
    goNextStep();
    return;
  }

  if (!validateCurrentStep()) return;

  const loading = document.getElementById("loadingOverlay");
  const submitBtn = document.querySelector("#newpanForm button[type='submit']");

  try {
    loading.style.display = "flex";
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    const firstName = document.getElementById("firstName").value.trim();
    const middleName = document.getElementById("middleName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();

    const fatherName =
      document.getElementById("fatherlastName").value.trim() + " " +
      (document.getElementById("fatherMiddleName").value.trim()
        ? document.getElementById("fatherMiddleName").value.trim() + " "
        : "") +
      document.getElementById("fatherFirstName").value.trim();

    const motherName =
      document.getElementById("motherlastName").value.trim() + " " +
      (document.getElementById("motherMiddleName").value.trim()
        ? document.getElementById("motherMiddleName").value.trim() + " "
        : "") +
      document.getElementById("motherfirstName").value.trim();

    const dobValue = document.getElementById("dob").value;
    const birthDate = new Date(dobValue);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    const files = [
      document.getElementById("photo").files[0],
      document.getElementById("signature").files[0],
      document.getElementById("aadhaarFront").files[0],
      document.getElementById("aadhaarBack").files[0],
      document.getElementById("dobProof").files[0]
    ];

    if (files.some((file) => !file)) throw "All files required";

    const [photo, signature, aadhaarFront, aadhaarBack, dobProof] =
      await Promise.all(files.map(uploadToCloudinary));

    let guardianName = "";
    let guardianFront = "";
    let guardianBack = "";

    if (age < 18) {
      const gFirst = document.getElementById("guardianfirstName").value.trim();
      const gMiddle = document.getElementById("guardianMiddleName").value.trim();
      const gLast = document.getElementById("guardianlastName").value.trim();

      const gName = gLast + " " + (gMiddle ? gMiddle + " " : "") + gFirst;
      const gFrontFile = document.getElementById("guardianAadhaarFront").files[0];
      const gBackFile = document.getElementById("guardianAadhaarBack").files[0];

      if (!gName.trim() || !gFrontFile || !gBackFile) {
        throw "Guardian details required for minor";
      }

      guardianName = gName;
      guardianFront = await uploadToCloudinary(gFrontFile);
      guardianBack = await uploadToCloudinary(gBackFile);
    }

    const ackNo = generateAck();
    const postOfficeEl = document.getElementById("postOffice");
    const manualEl = document.getElementById("manualPO");
    const postOfficeValue = postOfficeEl.value === "manual"
      ? manualEl.value.trim()
      : postOfficeEl.value.trim();

    if (!postOfficeValue) throw "Post Office required";

    formData = {
      ackNo,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      firstName,
      middleName,
      lastName,
      name: [firstName, middleName, lastName].filter(Boolean).join(" "),
      father: fatherName,
      mother: motherName,
      aadhaar: document.getElementById("aadhar").value,
      nameAadhar: document.getElementById("nameAadhar").value,
      dob: dobValue,
      age,
      isMinor: age < 18,
      gender: document.getElementById("gender").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      flatNo: document.getElementById("flatNo").value,
      villageCity: document.getElementById("villageCity").value,
      postOffice: postOfficeValue,
      subDivision: document.getElementById("subDivision").value,
      district: document.getElementById("district").value,
      state: document.getElementById("state").value,
      pinCode: document.getElementById("pinCode").value,
      dobdocType: document.getElementById("proof_dob").value,
      photo,
      signature,
      aadhaarFront,
      aadhaarBack,
      dobProof,
      guardianName,
      guardianFront,
      guardianBack,
      status: "pending",
      createdAt: new Date()
    };

    await db.collection("applications").add(formData);
    generatePDF(formData);
    clearDraft();
    showToast("Application submitted");

    setTimeout(() => {
      localStorage.setItem("ackNo", ackNo);
      window.location.href = "payment.html?ack=" + ackNo;
    }, 1500);
  } catch (err) {
    showToast("Error: " + err, "error");
  } finally {
    loading.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit";
  }
});

function generateAck() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return "PAN" + y + m + d + random;
}

function trackstatus() {
  document.getElementById("trackAckInput").value = "";
  document.getElementById("trackDetails").innerHTML = "";
  document.getElementById("payBtn").style.display = "none";
  document.getElementById("trackSubmitBtn").disabled = false;
  document.getElementById("trackSubmitBtn").innerText = "Check Status";
  openPopup("trackPopup");
  setTimeout(() => document.getElementById("trackAckInput").focus(), 50);
}

function submitTrackStatus() {
  let ack = document.getElementById("trackAckInput").value.trim().toUpperCase();
  const details = document.getElementById("trackDetails");
  const submitBtn = document.getElementById("trackSubmitBtn");
  const payBtn = document.getElementById("payBtn");

  if (!ack) {
    details.innerHTML = '<div class="track-message error">Please enter ACK number.</div>';
    return;
  }

  details.innerHTML = '<div class="track-message">Checking status...</div>';
  payBtn.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.innerText = "Checking...";

  db.collection("applications")
    .where("ackNo", "==", ack)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        details.innerHTML = '<div class="track-message error">Record not found. ACK number check karein.</div>';
        return;
      }

      const data = snapshot.docs[0].data();

      if (data.paymentStatus !== "paid") {
        payBtn.style.display = "block";
        payBtn.onclick = function () {
          window.location.href = "payment.html?ack=" + data.ackNo;
        };
      } else {
        payBtn.style.display = "none";
      }

      details.innerHTML = renderStatusDetails(data);
    })
    .catch((err) => {
      details.innerHTML = '<div class="track-message error">Error: ' + escapeHtml(err.message) + '</div>';
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.innerText = "Check Status";
    });
}

function closeTrackPopup() {
  closePopup("trackPopup");
  document.getElementById("trackAckInput").value = "";
  document.getElementById("trackDetails").innerHTML = "";
  document.getElementById("payBtn").style.display = "none";
}

function checkAge() {
  const dob = document.getElementById("dob").value;
  if (!dob) return;

  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

  const isMinor = age < 18;
  isMinorApplicant = isMinor;

  if (!isMinor) {
    document.getElementById("guardianfirstName").value = "";
    document.getElementById("guardianMiddleName").value = "";
    document.getElementById("guardianlastName").value = "";
    document.getElementById("guardianAadhaarFront").value = "";
    document.getElementById("guardianAadhaarBack").value = "";
  }

  renderSteps();
}

function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PAN Application Receipt", 20, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`ACK No: ${data.ackNo}`, 20, 40);
  doc.text(`Name: ${data.name}`, 20, 50);
  doc.text(`DOB: ${data.dob}`, 20, 60);
  doc.text(`Phone: ${data.phone}`, 20, 70);
  doc.text(`Email: ${data.email}`, 20, 80);
  doc.text("Status: Pending", 20, 90);

  if (data.isMinor) {
    doc.text("Applicant Type: Minor", 20, 100);
    doc.text(`Guardian: ${data.guardianName}`, 20, 110);
  }

  doc.text("Fee Paid: Rs. 190", 20, 130);
  doc.text("Thank you for applying!", 20, 150);
  doc.save(`PAN_ACK_${data.ackNo}.pdf`);
}

function downloadReceiptPdf(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const payment = getPaymentInfo(data.paymentStatus);
  const status = data.status || "pending";
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const brand = [15, 118, 110];
  const dark = [18, 52, 59];
  const muted = [102, 112, 133];
  const line = [216, 224, 234];

  function money(value) {
    return "Rs. " + value;
  }

  function drawBadge(text, x, y, color) {
    const width = Math.max(28, doc.getTextWidth(text) + 12);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, y - 5, width, 9, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(text, x + 6, y + 1);
    return width;
  }

  function sectionTitle(title, y) {
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, margin, y);
    doc.setDrawColor(line[0], line[1], line[2]);
    doc.line(margin, y + 4, pageWidth - margin, y + 4);
  }

  function infoRow(label, value, x, y, width) {
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), x, y);
    doc.setTextColor(23, 32, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(String(value || "N/A"), width);
    doc.text(lines, x, y + 6);
  }

  doc.setFillColor(238, 243, 248);
  doc.rect(0, 0, pageWidth, 297, "F");

  doc.setFillColor(dark[0], dark[1], dark[2]);
  doc.roundedRect(margin, 14, contentWidth, 38, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("TECH SOURCE", margin + 12, 29);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("PAN Card Service Receipt", margin + 12, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ACK RECEIPT", pageWidth - margin - 42, 29);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(formatDate(new Date()), pageWidth - margin - 42, 39);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 60, contentWidth, 35, 4, 4, "F");
  doc.setDrawColor(line[0], line[1], line[2]);
  doc.roundedRect(margin, 60, contentWidth, 35, 4, 4, "S");
  infoRow("Ack Number", data.ackNo || "N/A", margin + 10, 73, 64);
  infoRow("Applicant", data.name || "PAN Application", margin + 78, 73, 56);
  infoRow("Applied On", formatDate(data.createdAt), margin + 138, 73, 32);
  drawBadge(payment.text, pageWidth - margin - 42, 75, payment.className === "paid" ? [22, 101, 52] : [249, 115, 22]);

  sectionTitle("Applicant Details", 112);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 122, contentWidth, 52, 4, 4, "F");
  doc.setDrawColor(line[0], line[1], line[2]);
  doc.roundedRect(margin, 122, contentWidth, 52, 4, 4, "S");
  infoRow("Name", data.name || "N/A", margin + 10, 136, 78);
  infoRow("DOB", data.dob || "N/A", margin + 102, 136, 34);
  infoRow("Type", data.isMinor ? "Minor PAN" : "PAN", margin + 150, 136, 34);
  infoRow("Phone", data.phone || "N/A", margin + 10, 158, 54);
  infoRow("Email", data.email || "N/A", margin + 78, 158, 96);

  sectionTitle("Application Summary", 190);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 200, contentWidth, 45, 4, 4, "F");
  doc.setDrawColor(line[0], line[1], line[2]);
  doc.roundedRect(margin, 200, contentWidth, 45, 4, 4, "S");
  infoRow("Status", status, margin + 10, 214, 46);
  infoRow("Payment", payment.text, margin + 72, 214, 34);
  infoRow("Service Fee", money(190), margin + 120, 214, 34);
  infoRow("Remark", data.remark || "No remark", margin + 10, 234, 160);

  if (data.guardianName) {
    infoRow("Guardian", data.guardianName, margin + 120, 234, 54);
  }

  doc.setFillColor(231, 247, 244);
  doc.roundedRect(margin, 258, contentWidth, 16, 4, 4, "F");
  doc.setTextColor(11, 93, 86);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Keep this receipt for future status checks and payment reference.", margin + 10, 268);

  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Generated by TECH SOURCE PAN Card Service", margin, 286);
  doc.text("This is a system generated receipt.", pageWidth - margin - 52, 286);
  doc.save(`PAN_RECEIPT_${data.ackNo || "APPLICATION"}.pdf`);
}

function downloadHistoryReceipt(ackNo) {
  if (!ackNo) return;

  db.collection("applications")
    .where("ackNo", "==", ackNo)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        showToast("Record not found", "error");
        return;
      }

      downloadReceiptPdf(snapshot.docs[0].data());
      showToast("Receipt downloaded");
    })
    .catch((err) => {
      showToast("Receipt download failed: " + err.message, "error");
    });
}

async function getPan() {
  const loading = document.getElementById("loadingOverlay");
  const submitBtn = document.getElementById("submitBtn");
  const ackInput = document.getElementById("ackNo");
  const msg = document.getElementById("downloadMsg");
  const ack = ackInput.value.trim();

  loading.style.display = "flex";
  submitBtn.disabled = true;
  submitBtn.innerText = "Processing...";
  msg.style.color = "red";
  msg.innerText = "";

  try {
    if (!ack) {
      msg.innerText = "Enter Ack No";
      return;
    }

    msg.innerText = "Checking...";
    const snapshot = await db.collection("applications")
      .where("ackNo", "==", ack)
      .get();

    if (snapshot.empty) {
      msg.innerText = "No Record Found";
      return;
    }

    const data = snapshot.docs[0].data();

    if (!data.documentUrl) {
      msg.innerText = "PAN not ready yet";
      return;
    }

    msg.innerText = "Downloading...";

    const response = await fetch(data.documentUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `PAN_${data.ackNo}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    msg.style.color = "green";
    msg.innerText = "Download Started";

    setTimeout(() => {
      closeDownloadPopup();
    }, 1500);
  } catch (err) {
    msg.innerText = "Download failed: " + (err.message || err);
  } finally {
    loading.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit";
  }
}

function openPopup(id) {
  const popup = document.getElementById(id);
  popup.style.display = "flex";
  popup.classList.add("is-open");
  popup.setAttribute("aria-hidden", "false");
}

function closePopup(id) {
  const popup = document.getElementById(id);
  popup.style.display = "none";
  popup.classList.remove("is-open");
  popup.setAttribute("aria-hidden", "true");
}

function openDownloadPopup() {
  openPopup("downloadPopup");
}

function closeDownloadPopup() {
  closePopup("downloadPopup");
  document.getElementById("ackNo").value = "";
  document.getElementById("downloadMsg").innerText = "";
}

async function payNow() {
  const res = await fetch("http://localhost:5000/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 100 })
  });

  const data = await res.json();
  const cashfree = Cashfree({ mode: "sandbox" });

  cashfree.checkout({
    paymentSessionId: data.payment_session_id,
    redirectTarget: "_self"
  });
}

function openPaymentCheck() {
  openPopup("paymentPopup");
}

function closePaymentPopup() {
  closePopup("paymentPopup");
  document.getElementById("paymentAck").value = "";
  document.getElementById("paymentResult").innerText = "";
  document.getElementById("payNowBtn").style.display = "none";
}

async function checkPaymentStatus() {
  const ack = document.getElementById("paymentAck").value.trim().toUpperCase();
  const result = document.getElementById("paymentResult");
  const payBtn = document.getElementById("payNowBtn");

  if (!ack) {
    result.innerText = "Enter Ack No";
    result.style.color = "red";
    return;
  }

  result.innerText = "Checking...";
  payBtn.style.display = "none";

  try {
    const snapshot = await db.collection("applications")
      .where("ackNo", "==", ack)
      .get();

    if (snapshot.empty) {
      result.innerText = "Record not found";
      result.style.color = "red";
      return;
    }

    const data = snapshot.docs[0].data();

    if (data.paymentStatus === "paid") {
      result.innerText = "Payment Completed";
      result.style.color = "green";
    } else {
      result.innerText = "Payment Pending";
      result.style.color = "orange";
      payBtn.style.display = "block";
      payBtn.setAttribute("data-ack", ack);
    }
  } catch (err) {
    result.innerText = "Error: " + err.message;
  }
}

function goToPayment() {
  const ack = document.getElementById("payNowBtn").getAttribute("data-ack");
  window.location.href = "payment.html?ack=" + ack;
}

function updateAadhaarName() {
  const first = document.getElementById("firstName").value.trim();
  const middle = document.getElementById("middleName").value.trim();
  const last = document.getElementById("lastName").value.trim();
  const fullName = [first, middle, last].filter(Boolean).join(" ").toUpperCase();
  document.getElementById("nameAadhar").value = fullName;
}

document.getElementById("firstName").addEventListener("input", updateAadhaarName);
document.getElementById("middleName").addEventListener("input", updateAadhaarName);
document.getElementById("lastName").addEventListener("input", updateAadhaarName);

async function fetchAddress() {
  const pin = document.getElementById("pinCode").value;
  const select = document.getElementById("postOffice");

  if (pin.length !== 6) return;

  try {
    select.innerHTML = "<option>Loading...</option>";

    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();

    if (data[0].Status === "Success") {
      const offices = data[0].PostOffice;
      select.innerHTML = '<option value="">Select Post Office</option>';

      offices.forEach((po, index) => {
        const option = document.createElement("option");
        option.value = po.Name;
        option.text = `${po.Name} (${po.BranchType})`;
        select.appendChild(option);

        if (index === 0) {
          document.getElementById("district").value = po.District;
          document.getElementById("state").value = po.State;
        }
      });

      const manualOption = document.createElement("option");
      manualOption.value = "manual";
      manualOption.text = "Not in list? Enter manually";
      select.appendChild(manualOption);
    } else {
      select.innerHTML = "<option>No Post Office Found</option>";
      showToast("Invalid PIN Code", "error");
    }
  } catch (err) {
    console.error(err);
    select.innerHTML = "<option>Error loading</option>";
    showToast("Error fetching address", "error");
  }
}

document.getElementById("postOffice").addEventListener("change", function () {
  const manualInput = document.getElementById("manualPO");

  if (this.value === "manual") {
    manualInput.style.display = "block";
  } else {
    manualInput.style.display = "none";
    manualInput.value = "";
  }
});

document.querySelectorAll("#newpanForm input, #newpanForm select").forEach((field) => {
  if (field.type === "file") {
    field.addEventListener("change", () => {
      showToast("Documents selected. Files are not saved in draft.");
    });
    return;
  }

  field.addEventListener("input", scheduleDraftSave);
  field.addEventListener("change", scheduleDraftSave);
});

document.getElementById("loginOpenBtn").addEventListener("click", redirectToLogin);
document.getElementById("authSubmitBtn")?.addEventListener("click", handleAuthSubmit);
document.getElementById("authSwitchBtn")?.addEventListener("click", () => {
  redirectToLogin();
});

document.getElementById("trackAckInput")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitTrackStatus();
  }
});

document.getElementById("profilePhoto").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  document.getElementById("profilePreview").src = URL.createObjectURL(file);
});

auth.onAuthStateChanged(async (user) => {
  currentUser = user;

  if (!user) {
    currentProfile = {};
    updateAuthUI();
    return;
  }

  currentProfile = await getUserProfile(user);
  updateAuthUI();
  loadApplicationHistory();
});

document.getElementById("nextStepBtn").addEventListener("click", goNextStep);
document.getElementById("prevStepBtn").addEventListener("click", goPrevStep);
renderSteps();
