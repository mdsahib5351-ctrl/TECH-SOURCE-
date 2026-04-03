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

// GET ID FROM URL
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if(id){
    db.collection("applications").doc(id).get().then(doc=>{
        if(doc.exists){
            let d = doc.data();

            document.getElementById("data").innerHTML = `
<div class="section">
<b>Ack No:</b> ${d.ackNo}<br>
<b>Name:</b> ${d.name}<br>
<b>Name (Aadhaar):</b> ${d.nameAadhar}<br>
<b>Gender:</b> ${d.gender}<br>
<b>DOB:</b> ${d.dob}<br>
<b>Phone:</b> ${d.phone}<br>
<b>Email:</b> ${d.email}<br>
<b>Father Name:</b> ${d.father}<br>

<h3>Address</h3>
<b>Flat:</b> ${d.flatNo}<br>
<b>Village:</b> ${d.villageCity}<br>
<b>Post Office:</b> ${d.postOffice}<br>
<b>Sub Division:</b> ${d.subDivision}<br>
<b>District:</b> ${d.district}<br>
<b>State:</b> ${d.state}<br>
<b>PIN:</b> ${d.pinCode}<br>

<b>Status:</b> ${d.status}
</div>

<div class="section">
<h3>Documents</h3>
<img src="${d.photo}">
<img src="${d.signature}">
<img src="${d.aadhaarFront}">
<img src="${d.aadhaarBack}">
${d.isMinor ? `
  <h3>Guardian Documents</h3>
  <img src="${d.guardianFront}">
  <img src="${d.guardianBack}">
` : ""}
</div>
            `;
        }
    });
}