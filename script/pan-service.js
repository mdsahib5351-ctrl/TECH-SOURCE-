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

let formData = {};

/* OPEN CLOSE */
function openForm(){
  document.getElementById("formScreen").style.display="block";
}

function closeForm(){
  document.getElementById("formScreen").style.display="none";
}

/* IMGBB UPLOAD */
async function uploadToImgBB(file){
  if(!file) throw "File missing";

  let apiKey = "fa4ad05090c8cc3f9ade673a64a52235";

  let fd = new FormData();
  fd.append("image", file);

  let res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`,{
    method:"POST",
    body:fd
  });

  let data = await res.json();

  if(data.success){
    return data.data.url;
  }else{
    throw "Upload failed";
  }
}

/* SUBMIT */
document.getElementById("newpanForm").addEventListener("submit", async function(e) {
e.preventDefault();

const loading = document.getElementById("loadingOverlay");
const submitBtn = document.querySelector("#newpanForm button[type='submit']");

try {

    loading.style.display = "flex";
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    // 👤 NAME BUILD
    let firstName = document.getElementById("firstName").value;
    let middleName = document.getElementById("middleName").value;
    let lastName = document.getElementById("lastName").value;

    let fullName =
      lastName + " " +
      (middleName ? middleName + " " : "") +
      firstName;

    // 👨‍👩‍👦 FATHER
    let fatherName =
    document.getElementById("fatherlastName").value + " " +
      (document.getElementById("fatherMiddleName").value
      ? document.getElementById("fatherMiddleName").value + " "
      : "") +
    document.getElementById("fatherFirstName").value;

    let motherName =
      document.getElementById("motherlastName").value + " " +
      (document.getElementById("motherMiddleName").value
      ? document.getElementById("motherMiddleName").value + " "
      : "") +
    document.getElementById("motherfirstName").value;

    // 🎂 AGE
    let dobValue = document.getElementById("dob").value;
    let birthDate = new Date(dobValue);
    let today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    let m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    // 📤 UPLOAD
    let photo = await uploadToImgBB(document.getElementById("photo").files[0]);
    let signature = await uploadToImgBB(document.getElementById("signature").files[0]);
    let aadhaarFront = await uploadToImgBB(document.getElementById("aadhaarFront").files[0]);
    let aadhaarBack = await uploadToImgBB(document.getElementById("aadhaarBack").files[0]);
    let dobProof = await uploadToImgBB(document.getElementById("dobProof").files[0]);

    // 👶 GUARDIAN
    let guardianName = "";
    let guardianFront = "";
    let guardianBack = "";

    if(age < 18){

        let gFirst = document.getElementById("guardianfirstName").value;
        let gMiddle = document.getElementById("guardianMiddleName").value;
        let gLast = document.getElementById("guardianlastName").value;

        let gName =
          gLast + " " +
          (gMiddle ? gMiddle + " " : "") +
          gFirst;

        let gFrontFile = document.getElementById("guardianAadhaarFront").files[0];
        let gBackFile = document.getElementById("guardianAadhaarBack").files[0];

        if(!gName || !gFrontFile || !gBackFile){
            throw "Guardian details required for minor";
        }

        guardianName = gName;
        guardianFront = await uploadToImgBB(gFrontFile);
        guardianBack = await uploadToImgBB(gBackFile);
    }

    let ackNo = generateAck();

    formData = {
        ackNo,

        firstName,
        middleName,
        lastName,
        name: firstName + " " + middleName + " " + lastName,

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
        postOffice: document.getElementById("postOffice").value,
        subDivision: document.getElementById("subDivision").value,
        district: document.getElementById("district").value,
        state: document.getElementById("state").value,
        pinCode: document.getElementById("pinCode").value,
        dobdocType: document.getElementById("dobDocType").value,

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

    localStorage.setItem("ackNo", ackNo);
    window.location.href = "payment.html?ack=" + ackNo;

} catch(err) {
    alert("Error: " + err);
} finally {
    loading.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit";
}
});
function generateAck(){
  let date = new Date();

  let y = date.getFullYear();
  let m = String(date.getMonth()+1).padStart(2,'0');
  let d = String(date.getDate()).padStart(2,'0');

  let random = Math.floor(1000 + Math.random()*9000);

  return "PAN" + y + m + d + random;
}
function trackstatus(){
  let ack = prompt("अपना Ack No डालें:");

  if(!ack) return;

  ack = ack.trim().toUpperCase();

  db.collection("applications")
    .where("ackNo","==",ack)
    .get()
    .then(snapshot=>{

      if(snapshot.empty){
        alert("Record नहीं मिला ❌");
        return;
      }

      snapshot.forEach(doc=>{
        let data = doc.data();

        const payBtn = document.getElementById("payBtn");
        let html = "";

        // ❌ PAYMENT UNPAID CASE
        if(data.paymentStatus !== "paid"){

          html = `
            <b>ACK:</b> ${data.ackNo}<br>
            <b>Name:</b> ${data.name}<br><br>

            <span style="color:red; font-weight:bold; cursor:pointer;"
              onclick="window.location.href='payment.html?ack=${data.ackNo}'">
              ⚠️ Payment Pending - Click here to complete payment
            </span>
          `;

          // 👉 show pay button
          payBtn.style.display = "block";
          payBtn.onclick = function(){
            window.location.href = "payment.html?ack=" + data.ackNo;
          };

        }

        // ✅ PAYMENT PAID CASE
        else {

          let status =
            data.status === "approved" ? "🟢 Approved" :
            data.status === "under process" ? "🟠 Under process" :
            data.status === "rejected" ? "🔴 Rejected" :
            "🟡 Pending";

          let remark = (data.remark && data.remark.trim() !== "")
            ? data.remark
            : "No remark";

          html = `
            <b>ACK:</b> ${data.ackNo}<br>
            <b>Name:</b> ${data.name}<br>
            <b>Status:</b> ${status}<br>
            <b>Remark:</b> ${remark}
          `;

          // 👉 hide pay button
          payBtn.style.display = "none";
        }

        // 👉 show in popup
        document.getElementById("trackDetails").innerHTML = html;
        document.getElementById("trackPopup").style.display = "flex";
      });

    })
    .catch(err=>{
      alert("Error: "+err.message);
    });
}
function closeTrackPopup(){
  document.getElementById("trackPopup").style.display = "none";
}

function checkAge(){
  let dob = document.getElementById("dob").value;
  if(!dob) return;

  let birthDate = new Date(dob);
  let today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  let m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if(age < 18){
    document.getElementById("guardianSection").style.display = "block";
    document.getElementById("guardianFields").style.display = "grid";

    document.getElementById("gFrontBox").style.display = "block";
    document.getElementById("gBackBox").style.display = "block";

  }else{
    document.getElementById("guardianSection").style.display = "none";
    document.getElementById("guardianFields").style.display = "none";

    document.getElementById("gFrontBox").style.display = "none";
    document.getElementById("gBackBox").style.display = "none";

    // clear
    document.getElementById("guardianfirstName").value = "";
    document.getElementById("guardianMiddleName").value = "";
    document.getElementById("guardianlastName").value = "";
    document.getElementById("guardianAadhaarFront").value = "";
    document.getElementById("guardianAadhaarBack").value = "";
  }
}

function generatePDF(data){

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

  doc.text(`Status: Pending`, 20, 90);

  // Minor info
  if(data.isMinor){
    doc.text("Applicant Type: Minor", 20, 100);
    doc.text(`Guardian: ${data.guardianName}`, 20, 110);
  }

  doc.text("Fee Paid: Rs. 190", 20, 130);
  doc.text("Thank you for applying!", 20, 150);

  doc.save(`PAN_ACK_${data.ackNo}.pdf`);
}
async function getPan(){

    const loading = document.getElementById("loadingOverlay");
    const submitBtn = document.getElementById("submitBtn");
    const ackInput = document.getElementById("ackNo");
    const msg = document.getElementById("downloadMsg");

    // 👉 START LOADING
    loading.style.display = "flex";
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    const ack = ackInput.value.trim();

    msg.style.color = "red";
    msg.innerText = "";

    try {

        if(!ack){
            loading.style.display = "none";
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit";

            msg.innerText = "⚠️ Enter Ack No";
            return;
        }

        msg.innerText = "⏳ Checking...";

        const snapshot = await db.collection("applications")
            .where("ackNo", "==", ack)
            .get();

        if(snapshot.empty){
            loading.style.display = "none";
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit";

            msg.innerText = "❌ No Record Found";
            return;
        }

        const data = snapshot.docs[0].data();

        if(!data.documentUrl){
            loading.style.display = "none";
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit";

            msg.innerText = "⏳ PAN not ready yet";
            return;
        }

        msg.innerText = "⬇️ Downloading...";

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
        msg.innerText = "✅ Download Started";

        // 👉 SUCCESS END CLEANUP
        setTimeout(() => {
            closeDownloadPopup();
        }, 1500);

    } catch(err) {

        msg.innerText = "❌ Download failed: " + err.message;

    } finally {

        // 👉 ALWAYS RUN (MOST IMPORTANT FIX)
        loading.style.display = "none";
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit";
    }
}

function openDownloadPopup(){
    document.getElementById("downloadPopup").style.display = "flex";
}

function closeDownloadPopup(){
    document.getElementById("downloadPopup").style.display = "none";
    document.getElementById("ackNo").value = "";
    document.getElementById("downloadMsg").innerText = "";
}

async function payNow() {
  let res = await fetch("http://localhost:5000/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 100 })
  });

  let data = await res.json();

  const cashfree = Cashfree({
    mode: "sandbox"
  });

  cashfree.checkout({
    paymentSessionId: data.payment_session_id,
    redirectTarget: "_self"
  });
}

function openPaymentCheck(){
  document.getElementById("paymentPopup").style.display = "flex";
}

function closePaymentPopup(){
  document.getElementById("paymentPopup").style.display = "none";
  document.getElementById("paymentAck").value = "";
  document.getElementById("paymentResult").innerText = "";
  document.getElementById("payNowBtn").style.display = "none";
}

async function checkPaymentStatus(){
  const ack = document.getElementById("paymentAck").value.trim().toUpperCase();
  const result = document.getElementById("paymentResult");
  const payBtn = document.getElementById("payNowBtn");

  if(!ack){
    result.innerText = "⚠️ Enter Ack No";
    result.style.color = "red";
    return;
  }

  result.innerText = "⏳ Checking...";
  payBtn.style.display = "none";

  try{
    const snapshot = await db.collection("applications")
      .where("ackNo","==",ack)
      .get();

    if(snapshot.empty){
      result.innerText = "❌ Record not found";
      result.style.color = "red";
      return;
    }

    const data = snapshot.docs[0].data();

    if(data.paymentStatus === "paid"){
      result.innerText = "✅ Payment Completed";
      result.style.color = "green";
    } else {
      result.innerText = "❌ Payment Pending";
      result.style.color = "orange";

      // show pay button
      payBtn.style.display = "block";
      payBtn.setAttribute("data-ack", ack);
    }

  }catch(err){
    result.innerText = "Error: " + err.message;
  }
}

function goToPayment(){
  const ack = document.getElementById("payNowBtn").getAttribute("data-ack");
  window.location.href = "payment.html?ack=" + ack;
}

function updateAadhaarName(){
  let first = document.getElementById("firstName").value.trim();
  let middle = document.getElementById("middleName").value.trim();
  let last = document.getElementById("lastName").value.trim();

  let fullName = [first, middle, last]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  document.getElementById("nameAadhar").value = fullName;
}
document.getElementById("firstName").addEventListener("input", updateAadhaarName);
document.getElementById("middleName").addEventListener("input", updateAadhaarName);
document.getElementById("lastName").addEventListener("input", updateAadhaarName);
