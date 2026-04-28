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

function openForm() {
  if (!currentUser) {
    openAuthPopup("login");
    return;
  }

  const screen = document.getElementById("formScreen");
  const emailInput = document.getElementById("email");

  if (!emailInput.value) emailInput.value = currentUser.email || "";

  screen.style.display = "block";
  screen.classList.add("is-open");
  screen.setAttribute("aria-hidden", "false");
  renderSteps();
}

function closeForm() {
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
}

function goPrevStep() {
  currentStepIndex--;
  renderSteps();
}

function openAuthPopup(mode = "login") {
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
    openAuthPopup("login");
    return;
  }

  const avatar = getAvatarUrl(currentUser, currentProfile);
  document.getElementById("profilePreview").src = avatar;
  document.getElementById("profileName").value = currentProfile.name || currentUser.displayName || "";
  document.getElementById("profileEmail").value = currentUser.email || "";
  document.getElementById("profilePhone").value = currentProfile.phone || "";
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
    openAuthPopup("login");
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

function getStatusClass(status) {
  const normalized = (status || "pending").toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "under process") return "under-process";
  return "pending";
}

function showHistoryStatus(ackNo) {
  closeAccountPopup();
  document.getElementById("trackDetails").innerHTML = "Loading...";
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
      const status = data.status || "pending";
      const remark = data.remark && data.remark.trim() !== "" ? data.remark : "No remark";
      document.getElementById("trackDetails").innerHTML = `
        <b>ACK:</b> ${data.ackNo}<br>
        <b>Name:</b> ${data.name}<br>
        <b>Status:</b> ${status}<br>
        <b>Payment:</b> ${data.paymentStatus === "paid" ? "Paid" : "Pending"}<br>
        <b>Remark:</b> ${remark}
      `;
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
    openAuthPopup("login");
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
      grid.innerHTML = '<div class="empty-history">Abhi tak is account se koi PAN apply nahi hua.</div>';
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
      const payment = app.paymentStatus === "paid" ? "Paid" : "Pending";
      const paymentClass = app.paymentStatus === "paid" ? "paid" : "";
      return `
        <article class="history-card">
          <div class="history-card-head">
            <div>
              <h3>${app.name || "PAN Application"}</h3>
              <p class="ack-line">${app.ackNo || "N/A"}</p>
            </div>
            <span class="status-badge ${getStatusClass(status)}">${status}</span>
          </div>
          <div class="history-details">
            <div class="history-detail">
              <small>DOB</small>
              <strong>${app.dob || "N/A"}</strong>
            </div>
            <div class="history-detail">
              <small>Applied</small>
              <strong>${formatDate(app.createdAt)}</strong>
            </div>
            <div class="history-detail">
              <small>Payment</small>
              <strong><span class="payment-badge ${paymentClass}">${payment}</span></strong>
            </div>
            <div class="history-detail">
              <small>Type</small>
              <strong>${app.isMinor ? "Minor PAN" : "PAN"}</strong>
            </div>
          </div>
          <div class="history-actions">
            <button class="mini-btn" type="button" onclick="showHistoryStatus('${app.ackNo || ""}')">Status</button>
            <button class="mini-btn primary" type="button" onclick="goHistoryPayment('${app.ackNo || ""}', '${app.paymentStatus || ""}')">${app.paymentStatus === "paid" ? "View" : "Pay"}</button>
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

    setTimeout(() => {
      localStorage.setItem("ackNo", ackNo);
      window.location.href = "payment.html?ack=" + ackNo;
    }, 1500);
  } catch (err) {
    alert("Error: " + err);
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
  let ack = prompt("अपना Ack No डालें:");
  if (!ack) return;

  ack = ack.trim().toUpperCase();

  db.collection("applications")
    .where("ackNo", "==", ack)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        alert("Record नहीं मिला");
        return;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const payBtn = document.getElementById("payBtn");
        let html = "";

        if (data.paymentStatus !== "paid") {
          html = `
            <b>ACK:</b> ${data.ackNo}<br>
            <b>Name:</b> ${data.name}<br><br>
            <span class="status-link" onclick="window.location.href='payment.html?ack=${data.ackNo}'">
              Payment Pending - Click here to complete payment
            </span>
          `;

          payBtn.style.display = "block";
          payBtn.onclick = function () {
            window.location.href = "payment.html?ack=" + data.ackNo;
          };
        } else {
          const status =
            data.status === "approved" ? "Approved" :
              data.status === "under process" ? "Under process" :
                data.status === "rejected" ? "Rejected" :
                  "Pending";

          const remark = data.remark && data.remark.trim() !== ""
            ? data.remark
            : "No remark";

          html = `
            <b>ACK:</b> ${data.ackNo}<br>
            <b>Name:</b> ${data.name}<br>
            <b>Status:</b> ${status}<br>
            <b>Remark:</b> ${remark}
          `;

          payBtn.style.display = "none";
        }

        document.getElementById("trackDetails").innerHTML = html;
        openPopup("trackPopup");
      });
    })
    .catch((err) => {
      alert("Error: " + err.message);
    });
}

function closeTrackPopup() {
  closePopup("trackPopup");
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
      alert("Invalid PIN Code");
    }
  } catch (err) {
    console.error(err);
    select.innerHTML = "<option>Error loading</option>";
    alert("Error fetching address");
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

document.getElementById("loginOpenBtn").addEventListener("click", () => openAuthPopup("login"));
document.getElementById("authSubmitBtn").addEventListener("click", handleAuthSubmit);
document.getElementById("authSwitchBtn").addEventListener("click", () => {
  openAuthPopup(authMode === "login" ? "signup" : "login");
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
