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
document.getElementById("newpanForm").addEventListener("submit", async function(e){
e.preventDefault();

alert("Uploading documents... कृपया इंतजार करें ⏳");

let files = document.querySelectorAll('#newpanForm input[type="file"]');

try{

// 🔢 AGE CALCULATION
let dobValue = document.getElementById("dob").value;
let birthDate = new Date(dobValue);
let today = new Date();

let age = today.getFullYear() - birthDate.getFullYear();
let m = today.getMonth() - birthDate.getMonth();

if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
  age--;
}

// 📤 NORMAL UPLOAD
let photo = await uploadToImgBB(document.getElementById("photo").files[0]);
let signature = await uploadToImgBB(document.getElementById("signature").files[0]);
let aadhaarFront = await uploadToImgBB(document.getElementById("aadhaarFront").files[0]);
let aadhaarBack = await uploadToImgBB(document.getElementById("aadhaarBack").files[0]);

// 👇 GUARDIAN VARIABLES
let guardianName = "";
let guardianFront = "";
let guardianBack = "";

// 🧒 IF MINOR (<18)
if(age < 18){

  let gName = document.getElementById("guardianName").value;
  let gFrontFile = document.getElementById("guardianAadhaarFront").files[0];
  let gBackFile = document.getElementById("guardianAadhaarBack").files[0];

  if(!gName || !gFrontFile || !gBackFile){
    alert("Minor applicant ke liye guardian details required hai");
    return;
  }

  alert("Guardian documents upload ho rahe hain ⏳");

  guardianName = gName;
  guardianFront = await uploadToImgBB(gFrontFile);
  guardianBack = await uploadToImgBB(gBackFile);
}

let ackNo = generateAck();

// 📦 FINAL DATA
formData = {
  ackNo,
  title: document.getElementById("title").value,
  name: document.getElementById("name").value,
  aadhaar: document.getElementById("aadhar").value,
  nameAadhar: document.getElementById("nameAadhar").value,
  dob: dobValue,
  age, // ✅ extra useful field
  isMinor: age < 18, // ✅ flag

  gender: document.getElementById("gender").value,
  phone: document.getElementById("phone").value,
  email: document.getElementById("email").value,
  father: document.getElementById("fatherName").value,

  flatNo: document.getElementById("flatNo").value,
  villageCity: document.getElementById("villageCity").value,
  postOffice: document.getElementById("postOffice").value,
  subDivision: document.getElementById("subDivision").value,
  district: document.getElementById("district").value,
  state: document.getElementById("state").value,
  pinCode: document.getElementById("pinCode").value,

  photo,
  signature,
  aadhaarFront,
  aadhaarBack,

  // 👇 Guardian Data
  guardianName,
  guardianFront,
  guardianBack,

  status: "pending",
  createdAt: new Date()
};

await db.collection("applications").add(formData);

alert("Application Submitted ✅\nYour Ack No: " + ackNo);
generatePDF(formData);

document.getElementById("newpanForm").reset();

closeForm();

}catch(err){
alert("Error: "+err);
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

        let status =
  data.status === "approved" ? "🟢 Approved" :
  data.status === "under proccess" ? "🟠 Under process" :
  data.status === "rejected" ? "🔴 Rejected" :
  "🟡 Pending";

let remark = (data.remark && data.remark.trim() !== "") 
    ? data.remark 
    : "No remark";

alert(
`ACK: ${data.ackNo}

Name: ${data.name}

Status: ${status}

Remark: ${remark}`
);
      });

    })
    .catch(err=>{
      alert("Error: "+err.message);
    });
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
    document.getElementById("guardianName").value = "";
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