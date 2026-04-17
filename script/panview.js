// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDZ-NvSzXJrH8YyvI5GWVWRtZnSNe0NAxU",
  authDomain: "tech-source-bill.firebaseapp.com",
  databaseURL: "https://tech-source-bill-default-rtdb.firebaseio.com",
  projectId: "tech-source-bill",
  storageBucket: "tech-source-bill.firebasestorage.app",
  messagingSenderId: "690209240188",
  appId: "1:690209240188:web:6e54de365e7f839634c5f9"
};

// ✅ Safe init
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// 👉 URL से ID
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// ⏳ Loading
document.getElementById("data").innerHTML += "<p>Loading...</p>";

if (!id) {
  document.getElementById("data").innerHTML = "<p>Invalid ID</p>";
} else {

  db.collection("applications").doc(id)
    .onSnapshot(doc => {

      if (!doc.exists) {
        document.getElementById("data").innerHTML = "<p>No application found</p>";
        return;
      }

      const d = doc.data();

      // =========================
      // 👤 APPLICANT NAME
      // =========================
      let first = d.firstName || "";
      let middle = d.middleName || "";
      let last = d.lastName || "";

      let fullName = (first + " " + (middle ? middle + " " : "") + last).trim();

      document.getElementById("firstName").innerText = first || "-";
      document.getElementById("middleName").innerText = middle || "-";
      document.getElementById("lastName").innerText = last || "-";
      document.getElementById("fullName").innerText = fullName || "-";
      // =========================
      // 👨 FATHER SPLIT
      // =========================
      let fParts = (d.father || "").trim().split(" ");
      let fLast = fParts[0] || "";
      let fFirst = fParts[fParts.length - 1] || "";
      let fMiddle = fParts.slice(1, -1).join(" ");
      let fullFather = (fFirst + " " + (fMiddle ? fMiddle + " " : "") + fLast).trim();
      document.getElementById("fFirst").innerText = fFirst || "-";
      document.getElementById("fMiddle").innerText = fMiddle || "-";
      document.getElementById("fLast").innerText = fLast || "-";
      document.getElementById("fFull").innerText = fullFather || "-";

      // =========================
      // 👩 MOTHER SPLIT
      // =========================
      let mParts = (d.mother || "").trim().split(" ");
      let mLast = mParts[0] || "";
      let mFirst = mParts[mParts.length - 1] || "";
      let mMiddle = mParts.slice(1, -1).join(" ");
      let mFull = (mFirst + " " + (mMiddle ? mMiddle + " " : "") + mLast).trim();

      document.getElementById("mLast").innerText = mLast || "-";
      document.getElementById("mMiddle").innerText = mMiddle || "-";
      document.getElementById("mFirst").innerText = mFirst || "-";
      document.getElementById("mFull").innerText = mFull || "-";

      // =========================
      // 👶 GUARDIAN
      // =========================
      if (d.isMinor) {

        document.getElementById("guardianSection").style.display = "block";

        let gParts = (d.guardianName || "").trim().split(" ");
        let gLast = gParts[0] || "";
        let gFirst = gParts[gParts.length - 1] || "";
        let gMiddle = gParts.slice(1, -1).join(" ");
        let gFull = (gFirst + " " + (gMiddle ? gMiddle + " " : "") + gLast).trim();

        document.getElementById("gLast").innerText = gLast || "-";
        document.getElementById("gMiddle").innerText = gMiddle || "-";
        document.getElementById("gFirst").innerText = gFirst || "-";
        document.getElementById("gFull").innerText = gFull || "-";

      } else {
        document.getElementById("guardianSection").style.display = "none";
      }

      // =========================
      // 📋 BASIC DETAILS
      // =========================
      document.getElementById("ack").innerText = d.ackNo || "-";
      document.getElementById("aadhaarName").innerText = d.nameAadhar || "-";
      document.getElementById("gender").innerText = d.gender || "-";
      document.getElementById("dob").innerText = d.dob || "-";
      document.getElementById("phone").innerText = d.phone || "-";
      document.getElementById("email").innerText = d.email || "-";

      // =========================
      // 📍 ADDRESS
      // =========================
      document.getElementById("flat").innerText = d.flatNo || "-";
      document.getElementById("village").innerText = d.villageCity || "-";
      document.getElementById("post").innerText = d.postOffice || "-";
      document.getElementById("sub").innerText = d.subDivision || "-";
      document.getElementById("district").innerText = d.district || "-";
      document.getElementById("state").innerText = d.state || "-";
      document.getElementById("pin").innerText = d.pinCode || "-";

      // =========================
      // 📊 STATUS
      // =========================
      let statusEl = document.getElementById("status");
      let paymentEl = document.getElementById("payment");

      statusEl.innerText = d.status || "Pending";
      statusEl.style.color = d.status === "approved" ? "green" : "orange";

      paymentEl.innerText = d.paymentStatus || "Unpaid";
      paymentEl.style.color =
        (d.paymentStatus || "").toLowerCase() === "paid" ? "green" : "red";

      // =========================
      // 📂 DOCUMENTS
      // =========================
      let docsHTML = "";
      docsHTML += "<h4>Payment Screenshot</h4><hr>";
      docsHTML += imgBox(d.paymentScreenshot, "Payment Screenshot");
      docsHTML += imgBox(d.photo, "Photo");
      docsHTML += imgBox(d.signature, "Signature");
      docsHTML += imgBox(d.aadhaarFront, "Aadhaar Front");
      docsHTML += imgBox(d.aadhaarBack, "Aadhaar Back");
      docsHTML += imgBox(d.dobProof, "DOB Proof");

      if (d.isMinor) {
        docsHTML += "<hr><h4>Guardian Documents</h4>";
        docsHTML += imgBox(d.guardianFront, "Guardian Front");
        docsHTML += imgBox(d.guardianBack, "Guardian Back");
      }

      document.getElementById("docs").innerHTML = docsHTML;

    });
}


// ==========================
// 📋 COPY FUNCTION
// ==========================
function copyText(el) {
  const text = el.innerText;

  navigator.clipboard.writeText(text).then(() => {
    el.style.background = "#d4edda";
    el.style.padding = "2px 6px";
    el.style.borderRadius = "4px";

    showToast("Copied ✔");

    setTimeout(() => {
      el.style.background = "";
    }, 800);
  });
}


// ==========================
// 🔔 TOAST
// ==========================
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 1200);
}


// ==========================
// 🖼 IMAGE BOX
// ==========================
// ==========================
// 🖼 IMAGE BOX (FINAL)
// ==========================
function imgBox(url, name) {
  if (!url) return `<p>${name}: Not uploaded</p>`;

  // 👉 PHOTO & SIGNATURE → JPG
  if (name === "Photo" || name === "Signature") {
    return `
      <div class="doc-box">
        <p style="font-weight:bold; margin-bottom:5px;">${name}</p>
        <img src="${url}" alt="${name}">
        <button class="download-btn" onclick="downloadJPG('${url}', '${name}')">
          Download JPG
        </button>
      </div>
    `;
  }

  // 👉 बाकी सब → PDF
  return `
    <div class="doc-box">
      <p style="font-weight:bold; margin-bottom:5px;">${name}</p>
      <img src="${url}" alt="${name}">
      <button class="download-btn" onclick="downloadPDF('${url}', '${name}')">
        Download PDF
      </button>
    </div>
  `;
}


// ==========================
// 📸 JPG DOWNLOAD
// ==========================
function downloadJPG(url, name) {
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = function () {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    const link = document.createElement("a");
    link.download = name + ".jpg";
    link.href = canvas.toDataURL("image/jpeg");

    link.click();
  };

  img.src = url;
}


// ==========================
// 📄 PDF DOWNLOAD
// ==========================
async function downloadPDF(url, name) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const img = await fetch(url)
    .then(res => res.blob())
    .then(blob => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }));

  pdf.addImage(img, "JPEG", 10, 10, 180, 250);
  pdf.save(name + ".pdf");
}
