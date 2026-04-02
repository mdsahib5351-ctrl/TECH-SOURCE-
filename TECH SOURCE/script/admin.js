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

// FIRESTORE
const db = firebase.firestore();

// AUTH
const auth = firebase.auth();

// ADMIN EMAIL
const ADMIN_EMAIL = "techsource@gmail.com";


// LOGIN CHECK
firebase.auth().onAuthStateChanged(function(user){

// अगर login नहीं
if(!user){
window.location.replace("login.html");
return;
}

// अगर admin नहीं
if(user.email !== ADMIN_EMAIL){

firebase.auth().signOut().then(()=>{
window.location.replace("login.html");
});

return;
}

// admin allowed
document.body.style.display = "block";

});
const billTable = document.getElementById('billTable');
const paidCountEl = document.getElementById('paidCount');
const unpaidCountEl = document.getElementById('unpaidCount');
const cashTotalEl = document.getElementById('cashTotal');
const upiTotalEl = document.getElementById('upiTotal');
const dailyTotalEl = document.getElementById('dailyTotal');
const monthlyTotalEl = document.getElementById('monthlyTotal');
const overallTotalEl = document.getElementById('overallTotal');

let editDocId = null;
let currentTab = 'all'; // all / unpaid

// ========================
// Render Table
// ========================
function renderTable(bills){
    billTable.innerHTML = '';
    let paidCount=0, unpaidCount=0, cashTotal=0, upiTotal=0, dailyTotal=0, monthlyTotal=0, overallTotal=0;
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g,'-');
    const thisMonth = new Date().getMonth();

    bills.forEach(b=>{
        const subtotal = parseFloat(b.subtotal || 0);
        const discount = parseFloat(b.discount || 0);
        const paidAmount = parseFloat(b.paidAmount || 0);
        const totalAmount = subtotal - discount;

        // Due calculation
        const due = (b.paymentStatus === 'Paid') ? 0 : (totalAmount - paidAmount);

        // Stats
        if(b.paymentStatus==='Paid') paidCount++; else unpaidCount++;
        if(b.paymentMode==='Cash') cashTotal += totalAmount;
        if(b.paymentMode==='UPI') upiTotal += totalAmount;

        const bDate = b.date instanceof firebase.firestore.Timestamp ? b.date.toDate() : new Date(b.date);
        const dateOnly = bDate.toLocaleDateString('en-GB').replace(/\//g,'-');

        if(dateOnly===today) dailyTotal += totalAmount;
        if(bDate.getMonth()===thisMonth) monthlyTotal += totalAmount;
        overallTotal += totalAmount;

        // Skip row if tab = unpaid and bill is paid
        if(currentTab==='unpaid' && b.paymentStatus==='Paid') return;

        billTable.innerHTML += `
            <tr>
                <td>${b.billNo}</td>
                <td>${dateOnly}</td>
                <td class="customerLink" onclick="viewBill('${b.id}')"> ${b.customerName}</td>
                <td>${b.customerMobile}</td>
                <td>${b.paymentMode}</td>
                <td>₹${due}</td>
                <td>${b.paymentStatus}</td>
                <td class="button-group">
    <button class="viewBtn" onclick="viewBill('${b.id}')"></button>
    <button class="editBtn" onclick="openEditModal('${b.id}')"></button>
    <button class="deleteBtn" onclick="deleteBill('${b.id}')"></button>
${currentTab==='unpaid' ? `<button class="remindBtn" onclick="sendWhatsAppReminder('${b.customerName || ''}', '${b.customerMobile || ''}', '${b.billNo || ''}', '${due}', '${b.id}')"></button>` : ''}
        </td>
                <td>₹${totalAmount}</td>
            </tr>
        `;
    });

    // Update stats
    paidCountEl.textContent = paidCount;
    unpaidCountEl.textContent = unpaidCount;
    cashTotalEl.textContent = cashTotal;
    upiTotalEl.textContent = upiTotal;
    dailyTotalEl.textContent = dailyTotal;
    monthlyTotalEl.textContent = monthlyTotal;
    overallTotalEl.textContent = overallTotal;
}

// ========================
// Realtime listener
// ========================
db.collection('bills').orderBy('date','desc').onSnapshot(snapshot=>{
    let bills = [];
    snapshot.forEach(doc=>{
        let data = doc.data();
        data.id = doc.id;
        bills.push(data);
    });
    renderTable(bills);
});

// ========================
// Search / Filter
// ========================
function loadBills(){
    const searchMobile = document.getElementById('searchMobile').value.trim();
    const searchBill = document.getElementById('searchBill').value.trim();
    const dateFilter = document.getElementById('dateFilter').value;

    db.collection('bills').orderBy('date','desc').get().then(snapshot=>{
        let bills = [];
        snapshot.forEach(doc=>{
            let data = doc.data();
            data.id = doc.id;
            bills.push(data);
        });

        if(searchMobile) bills = bills.filter(b=>b.customerMobile.includes(searchMobile));
        if(searchBill) bills = bills.filter(b=>b.billNo.includes(searchBill));
        if(dateFilter){
            bills = bills.filter(b=>{
                const bDate = b.date instanceof firebase.firestore.Timestamp ? b.date.toDate() : new Date(b.date);
                return bDate.toISOString().split('T')[0]===dateFilter;
            });
        }

        renderTable(bills);
    });
}

// Clear filters
function clearFilters(){
    document.getElementById('searchMobile').value='';
    document.getElementById('searchBill').value='';
    document.getElementById('dateFilter').value='';
    loadBills();
}

// ========================
// Tab Switch
// ========================
function switchTab(tab, btn){
    currentTab = tab;

    // active button change
    document.querySelectorAll('.tabBtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');

    // 🔥 PAN tab ke liye header change
    if(tab === 'panlist'){
        document.querySelector('thead').innerHTML = `
            <tr>
                <th>Ack No</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Satus</th>
                <th>Docs</th>
                <th>Action</th>
            </tr>
        `;

        loadPanApplications(); // PAN data load
    }
    else{
        // 🔥 normal bills header wapas
        document.querySelector('thead').innerHTML = `
            <tr>
                <th>Bill No</th>
                <th>Date</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Payment Mode</th>
                <th>Due</th>
                <th>Status</th>
                <th>Action</th>
                <th>Total</th>
            </tr>
        `;

        loadBills(); // normal bills load
    }
}

function deleteBill(docId){
    if(confirm("Are you sure you want to delete this bill?")){
        db.collection('bills').doc(docId).delete().then(()=>{
            alert("Bill Deleted Successfully!");
        }).catch(err=>{
            alert("Error: "+err.message);
        });
    }
}

function openEditModal(docId){
    editDocId = docId;
    db.collection('bills').doc(docId).get().then(doc=>{
        if(doc.exists){
            const data = doc.data();
            document.getElementById('editCustomerName').value = data.customerName;
            document.getElementById('editCustomerMobile').value = data.customerMobile;
            document.getElementById('editSubtotal').value = data.subtotal || 0;
            document.getElementById('editPaidAmount').value = data.paidAmount || 0;
            document.getElementById('editDiscount').value = data.discount || 0;
            document.getElementById('editTotal').value = (data.subtotal - (data.discount || 0));
            document.getElementById('editPaymentMode').value = data.paymentMode || 'Cash';
            document.getElementById('editPaymentStatus').value = data.paymentStatus || 'Unpaid';
            document.getElementById('editModal').style.display = 'flex';
        }
    });
}

function closeModal(){
    document.getElementById('editModal').style.display='none';
}

document.getElementById('editDiscount').addEventListener('input', ()=>{
    const subtotal = parseFloat(document.getElementById('editSubtotal').value) || 0;
    const discount = parseFloat(document.getElementById('editDiscount').value) || 0;
    let total = subtotal - discount;
    if(total<0) total=0;
    document.getElementById('editTotal').value = total;
});

function saveEdit(){
    if(!editDocId) return;
    const customerName = document.getElementById('editCustomerName').value.trim();
    const customerMobile = document.getElementById('editCustomerMobile').value.trim();
    const paymentMode = document.getElementById('editPaymentMode').value;
    const paymentStatus = document.getElementById('editPaymentStatus').value;
    const subtotal = parseFloat(document.getElementById('editSubtotal').value) || 0;
    let discount = parseFloat(document.getElementById('editDiscount').value) || 0;
    if(discount>subtotal) discount=subtotal;
    const totalAmount = subtotal - discount;
    const paidAmount = parseFloat(document.getElementById('editPaidAmount').value) || 0;

    db.collection('bills').doc(editDocId).update({
        customerName,
        customerMobile,
        paymentMode,
        paymentStatus,
        subtotal,
        discount,
        totalAmount,
        paidAmount
    }).then(()=>{
        alert("Bill Updated Successfully!");
        closeModal();
    }).catch(err=>{
        alert("Error: "+err.message);
    });
}
function logout(){

firebase.auth().signOut().then(()=>{

alert("Logged Out Successfully");

window.location.href="login.html";

});

}

function sendWhatsAppReminder(customerName, mobile, billNo, dueAmount, docId){
    if(!mobile || !billNo || !customerName){
        alert("Customer Name, Mobile ya Bill No missing hai!");
        return;
    }

    mobile = mobile.replace(/\s+/g, '');

    // Aaj se +7 days ka due date
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 7);
    const yyyy = dueDate.getFullYear();
    const mm = String(dueDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dueDate.getDate()).padStart(2, '0');
    const formattedDate = `${dd}-${mm}-${yyyy}`;

    const message = encodeURIComponent(
`Hi,
*${customerName}*
Bill No: *${billNo}*
Due Amount: *₹${dueAmount}*
Last Date: *${formattedDate}*

_प्रिय_  *${customerName}*,
_यह एक अनुस्मारक है कि ऊपर उल्लिखित बिल की बकाया राशि(₹${dueAmount}) अभी तक भुगतान नहीं हुई है। कृपया सुनिश्चित करें कि भुगतान निर्धारित तिथि(${formattedDate}) से पहले कर दिया जाए, ताकि सेवा में कोई रुकावट न आए।_

Dear  *${customerName}*,
_This is a reminder that the above-mentioned bill has a pending amount(₹${dueAmount}). Please ensure that the payment is made before the due date(${formattedDate}) to avoid any service disruption._

_आप भुगतान इस लिंक पर क्लिक करके आसानी से कर सकते हैं_ */* _You can make the payment by clicking here:_
 
 *🢃Pay Now🢃*
https://mdsahib5351-ctrl.github.io/TECH-SOURCE-/billview.html?id=${docId}

~यदि आपने पहले ही भुगतान कर दिया है, तो कृपया इसे अनदेखा करें।~
~If you have already made the payment, please ignore this message.~

*धन्यवाद* / *Thank you*`
    );

    const whatsappUrl = `https://wa.me/91${mobile}?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

function viewBill(docId){
    window.open(`billview.html?id=${docId}`, '_blank');
}

function loadPanApplications(){
    db.collection('applications')
    .orderBy('createdAt','desc')
    .onSnapshot(snapshot=>{

        let html = '';

        snapshot.forEach(doc=>{
            let d = doc.data();

            html += `
            <tr>
                <td>${d.ackNo || '-'}</td>
                <td class="customerLink" onclick="viewPan('${doc.id}')">${d.name}</td>
                <td>${d.gender}</td>
                <td class="customerLink" onclick="openPanStatusEdit('${doc.id}', '${d.status || 'pending'}', '${d.remark || ''}')">
    ${d.status}
</td>
                <td>
                    <button onclick="window.open('${d.photo}')">Photo</button>
                    <button onclick="window.open('${d.aadhaarFront}')">Aadhaar</button>
                </td>
                <td>
                    <button onclick="openPanView('${doc.id}')">View</button>
                    <button onclick="editPan('${doc.id}')">Edit</button>
                    <button onclick="deletePan('${doc.id}')">Delete</button>
                </td>
            </tr>
            `;
        });

        billTable.innerHTML = html;
    });
}
function viewPan(docId){
    db.collection('applications').doc(docId).get().then(doc=>{
        let d = doc.data();

        alert(
`ACK: ${d.ackNo}

Name: ${d.name}
Gender: ${d.gender}

Status: ${d.status}

Photo:
${d.photo}

Aadhaar Front:
${d.aadhaarFront}

Aadhaar Back:
${d.aadhaarBack}

Signature:
${d.signature}`
        );
    });
}


function openPanView(docId){
    window.open(`panview.html?id=${docId}`, '_blank');
}

let currentPanId = null;

function editPan(docId){
    currentPanId = docId;

    db.collection('applications').doc(docId).get().then(doc=>{
        let d = doc.data();

        document.getElementById('panName').value = d.name || '';
        document.getElementById('panGender').value = d.gender || 'Male';
        document.getElementById('panStatus').value = d.status || 'pending';

        document.getElementById('panEditModal').style.display = 'flex';
    });
}

function closePanModal(){
    document.getElementById('panEditModal').style.display = 'none';
}

function deletePan(docId){
    if(confirm("Are you sure you want to delete this PAN application?")){
        db.collection('applications').doc(docId).delete().then(()=>{
            alert("PAN Application Deleted Successfully!");
        }).catch(err=>{
            alert("Error: "+err.message);
        });
    }
}

function savePanEdit(){
    if(!currentPanId) return;

    let name = document.getElementById('panName').value;
    let gender = document.getElementById('panGender').value;
    let status = document.getElementById('panStatus').value;

    db.collection('applications').doc(currentPanId).update({
        name,
        gender,
        status
    }).then(()=>{
        alert("Updated ✅");
        closePanModal();
        loadPanApplications();
    });
}
let currentPanStatusId = null;

function openPanStatusEdit(docId, currentStatus, remark){
    currentPanStatusId = docId;

    document.getElementById('panEditStatus').value = currentStatus || 'pending';
    document.getElementById('panEditRemark').value = remark || '';

    document.getElementById('panStatusEditModal').style.display = 'flex';
}

function closePanStatusEdit(){
    document.getElementById('panStatusEditModal').style.display = 'none';
}
function savePanStatusEdit(){
    if(!currentPanStatusId) return;

    const status = document.getElementById('panEditStatus').value;
    const remark = document.getElementById('panEditRemark').value.trim();

    db.collection('applications').doc(currentPanStatusId).update({
        status: status,
        remark: remark
    })
    .then(()=>{
        alert("Status Updated ✅");
        closePanStatusEdit();
    })
    .catch(err=>{
        alert("Error: " + err.message);
    });
}
function fillRemark(){
    let selected = document.getElementById("panRemarkSelect").value;

    if(selected){
        document.getElementById("panEditRemark").value = selected;
    }
}