const firebaseConfig = {
  apiKey: "AIzaSyDZ-NvSzXJrH8YyvI5GWVWRtZnSNe0NAxU",
  authDomain: "tech-source-bill.firebaseapp.com",
  databaseURL: "https://tech-source-bill-default-rtdb.firebaseio.com",
  projectId: "tech-source-bill",
  storageBucket: "tech-source-bill.firebasestorage.app",
  messagingSenderId: "690209240188",
  appId: "1:690209240188:web:6e54de365e7f839634c5f9"
};

// init firebase safely
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const container = document.getElementById("data");

if (!id) {
  container.innerHTML = "<p>Invalid ID</p>";
} else {
  db.collection("applications").doc(id).get()
    .then(doc => {
      if (!doc.exists) {
        container.innerHTML = "<p>No application found</p>";
        return;
      }

      const d = doc.data();

      container.innerHTML = `
        <div class="section">
          <b>Ack No:</b> ${d.ackNo || ""}<br>
          <b>Name:</b> ${d.name || ""}<br>
          <b>Name (Aadhaar):</b> ${d.nameAadhar || ""}<br>
          <b>Gender:</b> ${d.gender || ""}<br>
          <b>DOB:</b> ${d.dob || ""}<br>
          <b>Phone:</b> ${d.phone || ""}<br>
          <b>Email:</b> ${d.email || ""}<br>
          <b>Father Name:</b> ${d.father || ""}<br>

          <h3>Address</h3>
          <b>Flat:</b> ${d.flatNo || ""}<br>
          <b>Village:</b> ${d.villageCity || ""}<br>
          <b>Post Office:</b> ${d.postOffice || ""}<br>
          <b>Sub Division:</b> ${d.subDivision || ""}<br>
          <b>District:</b> ${d.district || ""}<br>
          <b>State:</b> ${d.state || ""}<br>
          <b>PIN:</b> ${d.pinCode || ""}<br>

          <b>Status:</b> ${d.status || "Pending"}
        </div>

        <div class="section">
          <h3>Documents</h3>

          ${imgBox(d.photo, "Photo")}
          ${imgBox(d.signature, "Signature")}
          ${imgBox(d.aadhaarFront, "Aadhaar Front")}
          ${imgBox(d.aadhaarBack, "Aadhaar Back")}
          ${imgBox(d.dobProof, "DOB Proof")}

          ${d.isMinor ? `
            <h3>Guardian Documents</h3>
            ${imgBox(d.guardianFront, "Guardian Aadhaar Front")}
            ${imgBox(d.guardianBack, "Guardian Aadhaar Back")}
          ` : ""}
        </div>
      `;
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = "<p>Error loading data</p>";
    });
}


// ==========================
// IMAGE BOX (SMART RULE)
// ==========================
function imgBox(url, name) {
  if (!url) return `<p>${name}: Not uploaded</p>`;

  // JPG for photo & signature
  if (name === "Photo" || name === "Signature") {
    return `
      <div class="doc-box">
        <img src="${url}" alt="${name}">
        <br>
        <button class="download-btn" onclick="downloadJPG('${url}', '${name}')">
          Download ${name} JPG
        </button>
      </div>
    `;
  }

  // PDF for others
  return `
    <div class="doc-box">
      <img src="${url}" alt="${name}">
      <br>
      <button class="download-btn" onclick="downloadPDF('${url}', '${name}')">
        Download ${name} PDF
      </button>
    </div>
  `;
}


// ==========================
// JPG DOWNLOAD
// ==========================
function downloadJPG(url, name) {
  if (!url) return alert(name + " not available");

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

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  img.src = url;
}


// ==========================
// PDF DOWNLOAD (jsPDF)
// ==========================
async function downloadPDF(url, name) {
  if (!url) return alert(name + " not available");

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
