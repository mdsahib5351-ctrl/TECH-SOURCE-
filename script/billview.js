
const firebaseConfig={
apiKey:"AIzaSyDZ-NvSzXJrH8YyvI5GWVWRtZnSNe0NAxU",
authDomain:"tech-source-bill.firebaseapp.com",
projectId:"tech-source-bill"
};

firebase.initializeApp(firebaseConfig);

const db=firebase.firestore();

let amount = 0;
let upiId = "7781826687@axl";
let name = "TECH SOURCE";
let currentData = null;
let serviceNames = "";

const billDetails=document.getElementById("billDetails");

const params=new URLSearchParams(window.location.search);

const billNo=params.get("billNo");
const docId=params.get("id");

if(!billNo && !docId){

billDetails.innerHTML="Bill ID missing";

}else{

let query;

if(docId){
query=db.collection("bills").doc(docId).get();
}else{
query=db.collection("bills").where("billNo","==",billNo).get();
}

query.then(snapshot=>{

let data;

if(docId){

if(!snapshot.exists){
billDetails.innerHTML="Bill not found";
return;
}

data=snapshot.data();
currentData = data;

}else{

if(snapshot.empty){
billDetails.innerHTML="Bill not found";
return;
}

data=snapshot.docs[0].data();
}

currentData = data;  // ✅ yahan add karo (common for both cases)

let servicesHTML="";

if(data.services){

data.services.forEach(s=>{

servicesHTML+=`
<tr>
<td>${s.name}</td>
<td>${s.qty}</td>
<td>₹${s.price}</td>
<td>₹${s.qty*s.price}</td>
</tr>
`;

});

}

/* ✅ YAHI PAR ADD KARO */
serviceNames = "";

if(data.services){
    serviceNames = data.services.map(s => s.name).join(", ");
}

/* Amount Calculation */

const totalAmount = data.totalAmount || 0;
const paidAmount = data.paidAmount || 0;
const dueAmount = totalAmount - paidAmount;

billDetails.innerHTML=`

<p class="billno">

  <span class="left">
    <b>Bill No:</b> ${data.billNo}
  </span>
  <span class="date">
    <b>Date:</b>
    ${
    data.date 
    ? (data.date.toDate 
        ? new Date(data.date.toDate()).toLocaleDateString('en-GB').replace(/\//g,'-')
        : new Date(data.date).toLocaleDateString('en-GB').replace(/\//g,'-')
      )
    : ""
    }
  </span>

</p>

<p class="name"><b>Name:</b> ${data.customerName}</p>
<p class="name"><b>Mobile:</b> ${data.customerMobile}</p>

<table>

<thead>
<tr>
<th>Service</th>
<th>Qty</th>
<th>Price</th>
<th>Total</th>
</tr>
</thead>

<tbody>

${servicesHTML}

</tbody>

</table>
<table style="width:100%; margin-top:10px;">

<tr>

<td colspan="2" style="border:none; padding:0;">

<div style="display:flex; justify-content:space-between; align-items:flex-end;">

<!-- LEFT SIDE (Amount Table) -->
<div style="width:40%;">
<table style="width:100%; border-collapse:collapse;">

${(data.discount||0) > 0 ? `
<tr>
<td>Subtotal</td>
<td>₹${data.subtotal||0}</td>
</tr>` : ``}

${(data.discount||0) > 0 ? `
<tr>
<td>Discount</td>
<td>₹${data.discount||0}</td>
</tr>` : ``}

<tr>
<td><b>Total</b></td>
<td><b>₹${totalAmount}</b></td>
</tr>

${paidAmount > 0 ? `
<tr>
<td>Paid</td>
<td style="color:green;">₹${paidAmount}</td>
</tr>` : ``}

${dueAmount > 0 ? `
<tr>
<td><b>Due</b></td>
<td style="color:red; text-decoration:bold; font-weight:bold;"><b>₹${dueAmount}</b></td>
</tr>` : ``}

</table>
</div>

<!-- RIGHT SIDE (Payment Info) -->
<div style="width:55%; text-align:right;">

<p><b>Payment Status:</b> ${data.paymentStatus}</p>

${data.paymentMode !== "Unpaid" ? `<p><b>Payment Mode:</b> ${data.paymentMode}</p>` : ``}

</div>

</div>

</td>

</tr>

</table>

`;
/* QR Amount Logic */

if(paidAmount <= 0){
amount = totalAmount;
}else{
amount = dueAmount;
}


const upiLink=`upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR`;
document.getElementById("qrcode").innerHTML = "";

new QRCode(document.getElementById("qrcode"),{
text:upiLink,
width:120,
height:120
});

/* Paid Stamp */

if(data.paymentStatus==="Paid"){
document.getElementById("paidStamp").style.display="block";
document.getElementById("qrText").innerHTML="Payment Completed";

// Pay button hide
document.getElementById("payBtn").style.display="none";
}

});

}
/* PDF */

async function downloadPDF(){

// 🔴 Step 1: Sab button hide karo
const buttons = document.querySelectorAll(".btn");
buttons.forEach(btn => btn.style.display = "none");

const invoice=document.getElementById("invoice");

const canvas=await html2canvas(invoice,{
scale:1.5,
useCORS:true
});

const imgData=canvas.toDataURL("image/jpeg",0.8);

const {jsPDF}=window.jspdf;

const pdf=new jsPDF("p","mm","a4");

const pdfWidth=210;
const pdfHeight=(canvas.height*pdfWidth)/canvas.width;

pdf.addImage(imgData,"JPEG",0,0,pdfWidth,pdfHeight);

pdf.save(`Bill-${currentData.billNo}.pdf`);

// 🔵 Step 2: Wapas show karo
buttons.forEach(btn => btn.style.display = "inline-block");

    }

/* Print */

function printBill(){

window.print();

}

function openPayOptions(){
    if(amount <= 0){
        alert("No payment due");
        return;
    }

    document.getElementById("payOptions").style.display = "flex";
}

function closePayOptions(){
    document.getElementById("payOptions").style.display = "none";
}
function payUPI(){
    const note = encodeURIComponent(
        `Bill ${currentData.billNo} - ${serviceNames}`
    );

    const upiLink = `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;

    window.location.href = upiLink;
}

function copyUPI(){
    navigator.clipboard.writeText(upiId);
    alert("UPI ID Copied: " + upiId);
}

function payWhatsApp(){
    const msg = encodeURIComponent(
        `Pay ₹${amount} to ${name}\nUPI: ${upiId}\nBill: ${currentData.billNo}`
    );

    window.open(`https://wame/91${mobile}?text=${msg}`, "_blank");
}

function requestToUser(){
    const userUpi = document.getElementById("userUpi").value.trim();

    if(!userUpi || !userUpi.includes("@")){
        alert("Enter valid UPI ID");
        return;
    }

    const note = encodeURIComponent(
        `Bill ${currentData.billNo} - ${serviceNames}`
    );

    // 🔥 Trick: reverse payment link (user ke side open hoga)
    const upiLink = `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;

    alert("Request sent! Ask customer to approve payment.");

    // 👉 user ko share karne ke liye WhatsApp open karo
    const msg = encodeURIComponent(
        `Payment Request\n\nPay ₹${amount} to ${name}\nUPI: ${upiId}\nBill: ${currentData.billNo}`
    );

    window.open(`https://wa.me/?text=${msg}`, "_blank");
}

function openQRPopup(){

    const note = encodeURIComponent(
        `Bill ${currentData.billNo} - ${serviceNames}`
    );

    const upiLink = `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;

    document.getElementById("bigQR").innerHTML = "";

    new QRCode(document.getElementById("bigQR"),{
        text: upiLink,
        width:200,
        height:200
    });

    document.getElementById("qrAmountText").innerText = `Amount: ₹${amount}`;

    document.getElementById("qrPopup").style.display = "flex";
}

function closeQR(){
    document.getElementById("qrPopup").style.display = "none";
}
