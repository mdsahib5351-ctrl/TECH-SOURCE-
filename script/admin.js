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
const ADMIN_EMAIL = "techsource@gmail.com";
const IMGBB_API_KEY = "fa4ad05090c8cc3f9ade673a64a52235";
const aadhaarSlotList = [
  "10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM",
  "12:30 PM","02:00 PM","02:30 PM","03:00 PM","03:30 PM"
];

const billTable = document.getElementById("billTable");
const tableHead = document.getElementById("tableHead");
const paidCountEl = document.getElementById("paidCount");
const unpaidCountEl = document.getElementById("unpaidCount");
const cashTotalEl = document.getElementById("cashTotal");
const upiTotalEl = document.getElementById("upiTotal");
const dailyTotalEl = document.getElementById("dailyTotal");
const monthlyTotalEl = document.getElementById("monthlyTotal");
const overallTotalEl = document.getElementById("overallTotal");
const panPendingCountEl = document.getElementById("panPendingCount");
const panApprovedCountEl = document.getElementById("panApprovedCount");
const aadhaarPendingCountEl = document.getElementById("aadhaarPendingCount");
const aadhaarApprovedCountEl = document.getElementById("aadhaarApprovedCount");
const todayAadhaarCountEl = document.getElementById("todayAadhaarCount");

let editDocId = null;
let currentPanId = null;
let currentPanStatusId = null;
let currentAadhaarStatusId = null;
let currentTab = "all";
let unsubscribeActiveList = null;
let latestBills = [];
let latestPanApplications = [];
let latestAadhaarApplications = [];
let currentExportRows = [];

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (user.email !== ADMIN_EMAIL) {
    firebase.auth().signOut().then(() => {
      window.location.replace("login.html");
    });
    return;
  }

  document.body.style.display = "block";
  loadDashboardApplicationCounts();
  startBillsListener();
});

function clearActiveListener() {
  if (typeof unsubscribeActiveList === "function") {
    unsubscribeActiveList();
    unsubscribeActiveList = null;
  }
}

function money(value) {
  return Number(value || 0).toFixed(0);
}

function safe(value) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

function htmlSafe(value) {
  const div = document.createElement("div");
  div.textContent = safe(value);
  return div.innerHTML;
}

function statusClass(status) {
  return safe(status).toLowerCase().replace(/\s+/g, "-");
}

function formatFirestoreDate(value) {
  if (!value) return "-";
  const date = value instanceof firebase.firestore.Timestamp ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB").replace(/\//g, "-");
}

function isoFirestoreDate(value) {
  if (!value) return "";
  const date = value instanceof firebase.firestore.Timestamp ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function includesText(value, query) {
  return safe(value).toLowerCase().includes(query.toLowerCase());
}

function setFilterPlaceholders(tab) {
  const searchMobile = document.getElementById("searchMobile");
  const searchBill = document.getElementById("searchBill");
  const statusFilter = document.getElementById("statusFilter");

  if (tab === "schedule") {
    searchMobile.placeholder = "Schedule search disabled";
    searchBill.placeholder = "Schedule search disabled";
    statusFilter.style.display = "none";
  } else if (tab === "panlist") {
    searchMobile.placeholder = "Search PAN name / ACK";
    searchBill.placeholder = "Search remark / gender";
    statusFilter.style.display = "";
  } else if (tab === "aadhaarlist") {
    searchMobile.placeholder = "Search name / mobile / Aadhaar / ID";
    searchBill.placeholder = "Search service / remark";
    statusFilter.style.display = "";
  } else {
    searchMobile.placeholder = "Search by mobile number";
    searchBill.placeholder = "Search by bill number";
    statusFilter.style.display = "";
  }
}

function setApplicationStats() {
  const todayIso = new Date().toISOString().split("T")[0];
  const panPending = latestPanApplications.filter((d) => safe(d.status || "pending").toLowerCase() === "pending").length;
  const panApproved = latestPanApplications.filter((d) => safe(d.status).toLowerCase() === "approved").length;
  const aadhaarPending = latestAadhaarApplications.filter((d) => safe(d.status || "Pending").toLowerCase() === "pending").length;
  const aadhaarApproved = latestAadhaarApplications.filter((d) => safe(d.status).toLowerCase() === "approved").length;
  const todayAadhaar = latestAadhaarApplications.filter((d) => d.appointmentDate === todayIso).length;

  panPendingCountEl.textContent = panPending;
  panApprovedCountEl.textContent = panApproved;
  aadhaarPendingCountEl.textContent = aadhaarPending;
  aadhaarApprovedCountEl.textContent = aadhaarApproved;
  todayAadhaarCountEl.textContent = todayAadhaar;
}

function loadDashboardApplicationCounts() {
  db.collection("applications").get().then((snapshot) => {
    latestPanApplications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setApplicationStats();
  }).catch(() => {});

  db.collection("appointments").get().then((snapshot) => {
    latestAadhaarApplications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setApplicationStats();
  }).catch(() => {});
}

function renderMessage(message, colspan) {
  billTable.innerHTML = `<tr><td colspan="${colspan}" class="muted">${htmlSafe(message)}</td></tr>`;
}

function setBillHead() {
  tableHead.innerHTML = `
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
}

function setPanHead() {
  tableHead.innerHTML = `
    <tr>
      <th>Ack No</th>
      <th>Name</th>
      <th>Gender</th>
      <th>Status</th>
      <th>Docs</th>
      <th>Action</th>
    </tr>
  `;
}

function setAadhaarHead() {
  tableHead.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Mobile</th>
      <th>Aadhaar</th>
      <th>Service</th>
      <th>Date</th>
      <th>Status</th>
      <th>Docs</th>
      <th>Action</th>
    </tr>
  `;
}

function setStats(bills) {
  let paidCount = 0;
  let unpaidCount = 0;
  let cashTotal = 0;
  let upiTotal = 0;
  let dailyTotal = 0;
  let monthlyTotal = 0;
  let overallTotal = 0;

  const now = new Date();
  const today = now.toLocaleDateString("en-GB").replace(/\//g, "-");
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  bills.forEach((b) => {
    const subtotal = parseFloat(b.subtotal || 0);
    const discount = parseFloat(b.discount || 0);
    const totalAmount = subtotal - discount;
    const bDate = b.date instanceof firebase.firestore.Timestamp ? b.date.toDate() : new Date(b.date);
    const dateOnly = Number.isNaN(bDate.getTime()) ? "" : bDate.toLocaleDateString("en-GB").replace(/\//g, "-");

    if (b.paymentStatus === "Paid") paidCount += 1;
    else unpaidCount += 1;

    if (b.paymentMode === "Cash") cashTotal += totalAmount;
    if (b.paymentMode === "UPI") upiTotal += totalAmount;
    if (dateOnly === today) dailyTotal += totalAmount;
    if (!Number.isNaN(bDate.getTime()) && bDate.getMonth() === thisMonth && bDate.getFullYear() === thisYear) {
      monthlyTotal += totalAmount;
    }
    overallTotal += totalAmount;
  });

  paidCountEl.textContent = paidCount;
  unpaidCountEl.textContent = unpaidCount;
  cashTotalEl.textContent = money(cashTotal);
  upiTotalEl.textContent = money(upiTotal);
  dailyTotalEl.textContent = money(dailyTotal);
  monthlyTotalEl.textContent = money(monthlyTotal);
  overallTotalEl.textContent = money(overallTotal);
}

function renderTable(bills) {
  setStats(bills);
  billTable.innerHTML = "";

  const rows = bills.filter((b) => !(currentTab === "unpaid" && b.paymentStatus === "Paid"));
  currentExportRows = rows.map((b) => {
    const subtotal = parseFloat(b.subtotal || 0);
    const discount = parseFloat(b.discount || 0);
    const paidAmount = parseFloat(b.paidAmount || 0);
    const totalAmount = subtotal - discount;
    return {
      billNo: b.billNo || "",
      date: formatFirestoreDate(b.date),
      customerName: b.customerName || "",
      customerMobile: b.customerMobile || "",
      paymentMode: b.paymentMode || "",
      paymentStatus: b.paymentStatus || "",
      due: b.paymentStatus === "Paid" ? 0 : totalAmount - paidAmount,
      totalAmount
    };
  });

  if (!rows.length) {
    renderMessage("No bills found.", 9);
    return;
  }

  rows.forEach((b) => {
    const subtotal = parseFloat(b.subtotal || 0);
    const discount = parseFloat(b.discount || 0);
    const paidAmount = parseFloat(b.paidAmount || 0);
    const totalAmount = subtotal - discount;
    const due = b.paymentStatus === "Paid" ? 0 : totalAmount - paidAmount;
    const dateOnly = formatFirestoreDate(b.date);
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${htmlSafe(b.billNo)}</td>
      <td>${htmlSafe(dateOnly)}</td>
      <td class="customerLink" onclick="viewBill('${b.id}')">${htmlSafe(b.customerName)}</td>
      <td>${htmlSafe(b.customerMobile)}</td>
      <td>${htmlSafe(b.paymentMode)}</td>
      <td>Rs. ${money(due)}</td>
      <td><span class="status ${statusClass(b.paymentStatus)}">${htmlSafe(b.paymentStatus)}</span></td>
      <td class="button-group">
        <button class="viewBtn" type="button" onclick="viewBill('${b.id}')"></button>
        <button class="editBtn" type="button" onclick="openEditModal('${b.id}')"></button>
        <button class="deleteBtn" type="button" onclick="deleteBill('${b.id}')"></button>
        ${currentTab === "unpaid" ? `<button class="remindBtn" type="button" onclick="sendWhatsAppReminder('${encodeArg(b.customerName)}', '${encodeArg(b.customerMobile)}', '${encodeArg(b.billNo)}', '${money(due)}', '${b.id}')"></button>` : ""}
      </td>
      <td>Rs. ${money(totalAmount)}</td>
    `;

    billTable.appendChild(tr);
  });
}

function encodeArg(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function startBillsListener() {
  clearActiveListener();
  setBillHead();
  setFilterPlaceholders(currentTab);
  unsubscribeActiveList = db.collection("bills").orderBy("date", "desc").onSnapshot((snapshot) => {
    const bills = [];
    snapshot.forEach((doc) => {
      bills.push({ id: doc.id, ...doc.data() });
    });
    latestBills = bills;
    renderTable(filterBills(latestBills));
  }, (error) => {
    renderMessage("Firebase Error: " + error.message, 9);
  });
}

function filterBills(bills) {
  const searchMobile = document.getElementById("searchMobile").value.trim();
  const searchBill = document.getElementById("searchBill").value.trim();
  const dateFilter = document.getElementById("dateFilter").value;
  const statusFilter = document.getElementById("statusFilter").value.toLowerCase();

  return bills.filter((b) => {
    if (searchMobile && !safe(b.customerMobile).includes(searchMobile)) return false;
    if (searchBill && !safe(b.billNo).includes(searchBill)) return false;
    if (statusFilter && safe(b.paymentStatus).toLowerCase() !== statusFilter) return false;
    if (dateFilter) {
      if (isoFirestoreDate(b.date) !== dateFilter) return false;
    }
    return true;
  });
}

function loadBills() {
  if (currentTab !== "all" && currentTab !== "unpaid") return;
  renderTable(filterBills(latestBills));
}

function loadCurrentList() {
  if (currentTab === "schedule") {
    renderScheduleManager();
  } else if (currentTab === "panlist") {
    renderPanApplications(filterPanApplications(latestPanApplications));
  } else if (currentTab === "aadhaarlist") {
    renderAadhaarApplications(filterAadhaarApplications(latestAadhaarApplications));
  } else {
    loadBills();
  }
}

function clearFilters() {
  document.getElementById("searchMobile").value = "";
  document.getElementById("searchBill").value = "";
  document.getElementById("dateFilter").value = "";
  document.getElementById("statusFilter").value = "";
  loadCurrentList();
}

function switchTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll(".tabBtn").forEach((button) => button.classList.remove("active"));
  btn.classList.add("active");

  if (tab === "schedule") {
    clearActiveListener();
    setFilterPlaceholders(tab);
    renderScheduleManager();
  } else if (tab === "panlist") {
    setPanHead();
    setFilterPlaceholders(tab);
    loadPanApplications();
  } else if (tab === "aadhaarlist") {
    setAadhaarHead();
    setFilterPlaceholders(tab);
    loadAadhaarApplications();
  } else {
    setFilterPlaceholders(tab);
    startBillsListener();
  }
}

function deleteBill(docId) {
  if (!confirm("Are you sure you want to delete this bill?")) return;

  db.collection("bills").doc(docId).delete().then(() => {
    alert("Bill Deleted Successfully!");
  }).catch((err) => {
    alert("Error: " + err.message);
  });
}

function openEditModal(docId) {
  editDocId = docId;
  db.collection("bills").doc(docId).get().then((doc) => {
    if (!doc.exists) {
      alert("Bill not found");
      return;
    }

    const data = doc.data();
    document.getElementById("editCustomerName").value = data.customerName || "";
    document.getElementById("editCustomerMobile").value = data.customerMobile || "";
    document.getElementById("editSubtotal").value = data.subtotal || 0;
    document.getElementById("editPaidAmount").value = data.paidAmount || 0;
    document.getElementById("editDiscount").value = data.discount || 0;
    document.getElementById("editTotal").value = (data.subtotal || 0) - (data.discount || 0);
    document.getElementById("editPaymentMode").value = data.paymentMode || "Cash";
    document.getElementById("editPaymentStatus").value = data.paymentStatus || "Unpaid";
    document.getElementById("editModal").style.display = "flex";
  });
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

document.getElementById("editDiscount").addEventListener("input", () => {
  const subtotal = parseFloat(document.getElementById("editSubtotal").value) || 0;
  const discount = parseFloat(document.getElementById("editDiscount").value) || 0;
  document.getElementById("editTotal").value = Math.max(subtotal - discount, 0);
});

function saveEdit() {
  if (!editDocId) return;

  const customerName = document.getElementById("editCustomerName").value.trim();
  const customerMobile = document.getElementById("editCustomerMobile").value.trim();
  const paymentMode = document.getElementById("editPaymentMode").value;
  const paymentStatus = document.getElementById("editPaymentStatus").value;
  const subtotal = parseFloat(document.getElementById("editSubtotal").value) || 0;
  const discount = Math.min(parseFloat(document.getElementById("editDiscount").value) || 0, subtotal);
  const paidAmount = parseFloat(document.getElementById("editPaidAmount").value) || 0;
  const totalAmount = subtotal - discount;

  db.collection("bills").doc(editDocId).update({
    customerName,
    customerMobile,
    paymentMode,
    paymentStatus,
    subtotal,
    discount,
    totalAmount,
    paidAmount
  }).then(() => {
    alert("Bill Updated Successfully!");
    closeModal();
  }).catch((err) => {
    alert("Error: " + err.message);
  });
}

function logout() {
  firebase.auth().signOut().then(() => {
    alert("Logged Out Successfully");
    window.location.href = "login.html";
  });
}

function sendWhatsAppReminder(customerName, mobile, billNo, dueAmount, docId) {
  if (!mobile || !billNo || !customerName) {
    alert("Customer Name, Mobile ya Bill No missing hai!");
    return;
  }

  const cleanMobile = mobile.replace(/\D/g, "");
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const formattedDate = dueDate.toLocaleDateString("en-GB").replace(/\//g, "-");

  const message = encodeURIComponent(
`Hi,
*${customerName}*
Bill No: *${billNo}*
Due Amount: *Rs. ${dueAmount}*
Last Date: *${formattedDate}*

Priya ${customerName},
Yeh reminder hai ki bill ki pending amount Rs. ${dueAmount} abhi unpaid hai. Kripya ${formattedDate} se pehle payment kar dein.

Pay Now:
https://mdsahib5351-ctrl.github.io/TECH-SOURCE-/billview.html?id=${docId}

Dhanyavaad / Thank you`
  );

  window.open(`https://wa.me/91${cleanMobile}?text=${message}`, "_blank");
}

function viewBill(docId) {
  window.open(`billview.html?id=${docId}`, "_blank");
}

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });
  const data = await res.json();

  if (!data.success) throw new Error("Upload failed");
  return data.data.url;
}

function loadPanApplications() {
  clearActiveListener();
  renderMessage("Loading PAN applications...", 6);

  unsubscribeActiveList = db.collection("applications").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    latestPanApplications = [];
    snapshot.forEach((doc) => {
      latestPanApplications.push({ id: doc.id, ...doc.data() });
    });
    setApplicationStats();
    renderPanApplications(filterPanApplications(latestPanApplications));
  }, (error) => {
    renderMessage("Firebase Error: " + error.message, 6);
  });
}

function filterPanApplications(applications) {
  const q1 = document.getElementById("searchMobile").value.trim();
  const q2 = document.getElementById("searchBill").value.trim();
  const dateFilter = document.getElementById("dateFilter").value;
  const statusFilter = document.getElementById("statusFilter").value.toLowerCase();

  return applications.filter((d) => {
    if (q1 && ![d.name, d.ackNo, d.mobile].some((value) => includesText(value, q1))) return false;
    if (q2 && ![d.gender, d.remark, d.paymentStatus].some((value) => includesText(value, q2))) return false;
    if (statusFilter && safe(d.status || "pending").toLowerCase() !== statusFilter) return false;
    if (dateFilter && isoFirestoreDate(d.createdAt) !== dateFilter) return false;
    return true;
  });
}

function renderPanApplications(applications) {
  billTable.innerHTML = "";
  currentExportRows = applications.map((d) => ({
    ackNo: d.ackNo || "",
    name: d.name || "",
    gender: d.gender || "",
    status: d.status || "pending",
    paymentStatus: d.paymentStatus || "",
    remark: d.remark || "",
    createdAt: formatFirestoreDate(d.createdAt)
  }));

  if (!applications.length) {
    renderMessage("No PAN applications found.", 6);
    return;
  }

  applications.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${htmlSafe(d.ackNo)}</td>
      <td class="customerLink" onclick="viewPan('${d.id}')">${htmlSafe(d.name)}</td>
      <td>${htmlSafe(d.gender)}</td>
      <td class="customerLink" onclick="openPanStatusEdit('${d.id}')">
        <span class="status ${statusClass(d.status || "pending")}">${htmlSafe(d.status || "pending")}</span>
      </td>
      <td class="button-group">
        ${d.photo ? `<button class="docBtn" type="button" onclick="window.open('${d.photo}', '_blank')">Photo</button>` : `<span class="muted">No Photo</span>`}
        ${d.aadhaarFront ? `<button class="docBtn" type="button" onclick="window.open('${d.aadhaarFront}', '_blank')">Aadhaar</button>` : ""}
        ${d.documentUrl ? `<button class="docBtn" type="button" onclick="downloadPan('${d.documentUrl}')">Download PAN</button>` : `<span style="color:red;">Not Ready</span>`}
      </td>
      <td class="button-group">
        <button class="textBtn" type="button" onclick="openPanView('${d.id}')">View</button>
        <button class="editBtn" type="button" onclick="editPan('${d.id}')"></button>
        <button class="deleteBtn" type="button" onclick="deletePan('${d.id}')"></button>
      </td>
    `;
    billTable.appendChild(tr);
  });
}

function viewPan(docId) {
  db.collection("applications").doc(docId).get().then((doc) => {
    if (!doc.exists) {
      alert("PAN application not found");
      return;
    }

    const d = doc.data();
    alert(
`ACK: ${safe(d.ackNo)}

Name: ${safe(d.name)}
Gender: ${safe(d.gender)}
Status: ${safe(d.status)}

Photo:
${safe(d.photo)}

Aadhaar Front:
${safe(d.aadhaarFront)}

Aadhaar Back:
${safe(d.aadhaarBack)}

Signature:
${safe(d.signature)}`
    );
  });
}

function openPanView(docId) {
  window.open(`panview.html?id=${docId}`, "_blank");
}

function editPan(docId) {
  currentPanId = docId;
  db.collection("applications").doc(docId).get().then((doc) => {
    if (!doc.exists) {
      alert("PAN application not found");
      return;
    }

    const d = doc.data();
    document.getElementById("panName").value = d.name || "";
    document.getElementById("panGender").value = d.gender || "Male";
    document.getElementById("panStatus").value = d.status || "pending";
    document.getElementById("panEditModal").style.display = "flex";
  });
}

function closePanModal() {
  document.getElementById("panEditModal").style.display = "none";
}

function deletePan(docId) {
  if (!confirm("Are you sure you want to delete this PAN application?")) return;

  db.collection("applications").doc(docId).delete().then(() => {
    alert("PAN Application Deleted Successfully!");
  }).catch((err) => {
    alert("Error: " + err.message);
  });
}

function savePanEdit() {
  if (!currentPanId) return;

  const name = document.getElementById("panName").value.trim();
  const gender = document.getElementById("panGender").value;
  const status = document.getElementById("panStatus").value;

  db.collection("applications").doc(currentPanId).update({
    name,
    gender,
    status
  }).then(() => {
    alert("Updated");
    closePanModal();
  }).catch((err) => {
    alert("Error: " + err.message);
  });
}

function openPanStatusEdit(docId) {
  currentPanStatusId = docId;

  db.collection("applications").doc(docId).get().then((doc) => {
    if (!doc.exists) {
      alert("PAN application not found");
      return;
    }

    const d = doc.data();
    document.getElementById("panEditStatus").value = d.status || "pending";
    document.getElementById("panEditRemark").value = d.remark || "";
    document.getElementById("panPaymentStatus").value = d.paymentStatus || "unpaid";
    document.getElementById("panDocument").value = "";
    document.getElementById("panStatusEditModal").style.display = "flex";
  });
}

function closePanStatusEdit() {
  document.getElementById("panStatusEditModal").style.display = "none";
}

async function savePanStatusEdit() {
  if (!currentPanStatusId) return;

  const status = document.getElementById("panEditStatus").value;
  const remark = document.getElementById("panEditRemark").value.trim();
  const paymentStatus = document.getElementById("panPaymentStatus").value.toLowerCase();
  const file = document.getElementById("panDocument").files[0];

  try {
    const updateData = { status, remark, paymentStatus };

    if (status === "approved" && file) {
      updateData.documentUrl = await uploadToImgBB(file);
    }

    await db.collection("applications").doc(currentPanStatusId).update(updateData);
    alert("PAN Updated Successfully");
    closePanStatusEdit();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function fillRemark() {
  const selected = document.getElementById("panRemarkSelect").value;
  if (selected) document.getElementById("panEditRemark").value = selected;
}

function downloadPan(url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "PAN_Card.jpg";
  a.click();
}

function exportCurrentCSV() {
  if (!currentExportRows.length) {
    alert("Export ke liye data available nahi hai");
    return;
  }

  const headers = Object.keys(currentExportRows[0]);
  const csvRows = [
    headers.join(","),
    ...currentExportRows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentTab}-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function loadAadhaarApplications() {
  clearActiveListener();
  renderMessage("Loading Aadhaar applications...", 8);

  unsubscribeActiveList = db.collection("appointments").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    latestAadhaarApplications = [];
    snapshot.forEach((doc) => {
      latestAadhaarApplications.push({ id: doc.id, ...doc.data() });
    });
    setApplicationStats();
    renderAadhaarApplications(filterAadhaarApplications(latestAadhaarApplications));
  }, (error) => {
    renderMessage("Firebase Error: " + error.message, 8);
  });
}

function filterAadhaarApplications(applications) {
  const q1 = document.getElementById("searchMobile").value.trim();
  const q2 = document.getElementById("searchBill").value.trim();
  const dateFilter = document.getElementById("dateFilter").value;
  const statusFilter = document.getElementById("statusFilter").value.toLowerCase();

  return applications.filter((d) => {
    if (q1 && ![d.name, d.mobile, d.aadhaar, d.aadhaarMasked, d.appointmentId].some((value) => includesText(value, q1))) return false;
    if (q2 && ![d.service, d.adminRemark, d.status].some((value) => includesText(value, q2))) return false;
    if (statusFilter && safe(d.status || "Pending").toLowerCase() !== statusFilter) return false;
    if (dateFilter && d.appointmentDate !== dateFilter) return false;
    return true;
  });
}

function renderAadhaarApplications(applications) {
  billTable.innerHTML = "";
  currentExportRows = applications.map((d) => ({
    appointmentId: d.appointmentId || "",
    name: d.name || "",
    mobile: d.mobile || "",
    aadhaar: d.aadhaarMasked || maskAadhaar(d.aadhaar),
    service: d.service || "",
    appointmentDate: d.appointmentDate || "",
    appointmentTime: d.appointmentTime || "",
    status: d.status || "Pending",
    adminRemark: d.adminRemark || ""
  }));

  if (!applications.length) {
    renderMessage("No Aadhaar appointments found.", 8);
    return;
  }

  applications.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="customerLink" onclick="openAadhaarView('${d.id}')">${htmlSafe(d.name)}</td>
      <td>${htmlSafe(d.mobile)}</td>
      <td>${htmlSafe(d.aadhaarMasked || maskAadhaar(d.aadhaar))}</td>
      <td>${htmlSafe(d.service)}</td>
      <td>${htmlSafe(d.appointmentDate)} ${htmlSafe(d.appointmentTime)}</td>
      <td><span class="status ${statusClass(d.status || "Pending")}">${htmlSafe(d.status || "Pending")}</span></td>
      <td>
        ${d.documentUrl ? `<button class="docBtn" type="button" onclick="window.open('${d.documentUrl}', '_blank')">View</button>` : `<span style="color:red;">No File</span>`}
      </td>
      <td class="button-group">
        <button class="viewBtn" type="button" onclick="openAadhaarView('${d.id}')"></button>
        <button class="statusBtn" type="button" onclick="openAadhaarStatusModal('${d.id}')">Status</button>
        <button class="whatsappBtn" type="button" onclick="sendAadhaarWhatsApp('${d.id}')"></button>
        <button class="deleteBtn" type="button" onclick="deleteAadhaar('${d.id}')"></button>
      </td>
    `;
    billTable.appendChild(tr);
  });
}

function setScheduleHead() {
  tableHead.innerHTML = `
    <tr>
      <th>Appointment Availability Manager</th>
    </tr>
  `;
}

function renderScheduleManager() {
  setScheduleHead();
  currentExportRows = [];

  billTable.innerHTML = `
    <tr>
      <td>
        <div class="schedule-panel">
          <h3>Aadhaar Appointment Schedule</h3>
          <p class="muted">Date wise holiday ya unavailable time slots set karein. Ye booking aur reschedule dono jagah apply hoga.</p>

          <div class="schedule-grid">
            <div class="schedule-field">
              <label for="scheduleDate">Date</label>
              <input type="date" id="scheduleDate" onchange="loadScheduleForDate()">
            </div>
            <div class="schedule-field">
              <label for="scheduleNote">Admin Note</label>
              <textarea id="scheduleNote" rows="2" placeholder="Reason, example: shop closed / lunch break / personal work"></textarea>
            </div>
          </div>

          <label class="holiday-row">
            <input type="checkbox" id="scheduleHoliday" onchange="toggleScheduleHoliday()">
            Full day holiday / closed
          </label>

          <h3>Block Time Slots</h3>
          <div class="slot-check-grid" id="scheduleSlots">
            ${aadhaarSlotList.map((slot) => `
              <label class="slot-check">
                <input type="checkbox" value="${slot}">
                ${slot}
              </label>
            `).join("")}
          </div>

          <div class="schedule-actions">
            <button type="button" onclick="saveScheduleAvailability()">Save Schedule</button>
            <button class="danger" type="button" onclick="deleteScheduleAvailability()">Delete This Date Rule</button>
            <button type="button" onclick="loadScheduleList()">Refresh List</button>
          </div>

          <div class="schedule-list" id="scheduleList"></div>
        </div>
      </td>
    </tr>
  `;

  document.getElementById("scheduleDate").value = new Date().toISOString().split("T")[0];
  loadScheduleForDate();
  loadScheduleList();
}

function toggleScheduleHoliday() {
  const isHoliday = document.getElementById("scheduleHoliday").checked;
  document.querySelectorAll("#scheduleSlots input").forEach((input) => {
    input.disabled = isHoliday;
    if (isHoliday) input.checked = false;
  });
}

async function loadScheduleForDate() {
  const date = document.getElementById("scheduleDate")?.value;
  if (!date) return;

  document.getElementById("scheduleHoliday").checked = false;
  document.getElementById("scheduleNote").value = "";
  document.querySelectorAll("#scheduleSlots input").forEach((input) => {
    input.checked = false;
    input.disabled = false;
  });

  const doc = await db.collection("aadhaarAvailability").doc(date).get().catch(() => null);
  if (!doc || !doc.exists) return;

  const data = doc.data();
  document.getElementById("scheduleHoliday").checked = !!data.holiday;
  document.getElementById("scheduleNote").value = data.note || "";
  const blockedSlots = Array.isArray(data.blockedSlots) ? data.blockedSlots : [];

  document.querySelectorAll("#scheduleSlots input").forEach((input) => {
    input.checked = blockedSlots.includes(input.value);
  });

  toggleScheduleHoliday();
}

async function saveScheduleAvailability() {
  const date = document.getElementById("scheduleDate").value;
  const holiday = document.getElementById("scheduleHoliday").checked;
  const note = document.getElementById("scheduleNote").value.trim();
  const blockedSlots = holiday ? [] : Array.from(document.querySelectorAll("#scheduleSlots input:checked")).map((input) => input.value);

  if (!date) {
    alert("Date select karo");
    return;
  }

  await db.collection("aadhaarAvailability").doc(date).set({
    date,
    holiday,
    blockedSlots,
    note,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  alert("Schedule saved");
  loadScheduleList();
}

async function deleteScheduleAvailability() {
  const date = document.getElementById("scheduleDate").value;
  if (!date) return alert("Date select karo");
  if (!confirm("Is date ka schedule rule delete karna hai?")) return;

  await db.collection("aadhaarAvailability").doc(date).delete();
  alert("Schedule rule deleted");
  loadScheduleForDate();
  loadScheduleList();
}

async function loadScheduleList() {
  const list = document.getElementById("scheduleList");
  if (!list) return;

  list.innerHTML = `<div class="muted">Loading schedule...</div>`;

  try {
    const snap = await db.collection("aadhaarAvailability").orderBy("date", "asc").get();

    if (snap.empty) {
      list.innerHTML = `<div class="muted">No holiday or blocked slot rule saved yet.</div>`;
      return;
    }

    list.innerHTML = "";
    snap.forEach((doc) => {
      const data = doc.data();
      const slotsText = data.holiday ? "Full day holiday" : (data.blockedSlots || []).join(", ") || "No slot blocked";
      const item = document.createElement("div");
      item.className = "schedule-item";
      item.innerHTML = `
        <div>
          <strong>${htmlSafe(data.date)}</strong>
          <span>${htmlSafe(slotsText)}</span>
          ${data.note ? `<span>Note: ${htmlSafe(data.note)}</span>` : ""}
        </div>
        <button class="textBtn" type="button" onclick="editScheduleDate('${htmlSafe(data.date)}')">Edit</button>
      `;
      list.appendChild(item);
    });
  } catch (error) {
    list.innerHTML = `<div class="muted">Firebase Error: ${htmlSafe(error.message)}</div>`;
  }
}

function editScheduleDate(date) {
  document.getElementById("scheduleDate").value = date;
  loadScheduleForDate();
}

function maskAadhaar(value) {
  const aadhaar = safe(value).replace(/\D/g, "");
  return aadhaar.length >= 4 ? "XXXX XXXX " + aadhaar.slice(-4) : safe(value);
}

function openAadhaarView(docId) {
  window.open(`adhaarappoinmentview.html?docId=${encodeURIComponent(docId)}`, "_blank");
}

function updateAadhaarStatus(id, status) {
  db.collection("appointments").doc(id).update({
    status,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("Updated");
  }).catch((err) => {
    alert("Error: " + err.message);
  });
}

function openAadhaarStatusModal(docId) {
  currentAadhaarStatusId = docId;
  const data = latestAadhaarApplications.find((item) => item.id === docId);

  if (!data) {
    alert("Appointment not found");
    return;
  }

  document.getElementById("aadhaarEditStatus").value = data.status || "Pending";
  document.getElementById("aadhaarEditDate").value = data.appointmentDate || "";
  document.getElementById("aadhaarEditTime").value = data.appointmentTime || "";
  document.getElementById("aadhaarEditRemark").value = data.adminRemark || "";
  document.getElementById("aadhaarStatusModal").style.display = "flex";
}

function closeAadhaarStatusModal() {
  document.getElementById("aadhaarStatusModal").style.display = "none";
}

function saveAadhaarStatusEdit() {
  if (!currentAadhaarStatusId) return;

  const status = document.getElementById("aadhaarEditStatus").value;
  const appointmentDate = document.getElementById("aadhaarEditDate").value;
  const appointmentTime = document.getElementById("aadhaarEditTime").value.trim();
  const adminRemark = document.getElementById("aadhaarEditRemark").value.trim();

  db.collection("appointments").doc(currentAadhaarStatusId).update({
    status,
    appointmentDate,
    appointmentTime,
    adminRemark,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("Aadhaar appointment updated");
    closeAadhaarStatusModal();
  }).catch((err) => {
    alert("Error: " + err.message);
  });
}

function sendAadhaarWhatsApp(docId) {
  const d = latestAadhaarApplications.find((item) => item.id === docId);
  if (!d) {
    alert("Appointment not found");
    return;
  }

  const mobile = safe(d.mobile).replace(/\D/g, "");
  if (mobile.length !== 10) {
    alert("Valid mobile number nahi mila");
    return;
  }

  const message = encodeURIComponent(
`TECH SOURCE Aadhaar Appointment

Name: ${safe(d.name)}
Appointment ID: ${safe(d.appointmentId)}
Service: ${safe(d.service)}
Date: ${safe(d.appointmentDate)}
Time: ${safe(d.appointmentTime)}
Status: ${safe(d.status || "Pending")}
Remark: ${safe(d.adminRemark)}

Full details:
${window.location.origin}${window.location.pathname.replace("admin.html", "adhaarappoinmentview.html")}?docId=${encodeURIComponent(docId)}`
  );

  window.open(`https://wa.me/91${mobile}?text=${message}`, "_blank");
}

function deleteAadhaar(id) {
  if (!confirm("Delete this Aadhaar application?")) return;

  db.collection("appointments").doc(id).delete().then(() => {
    alert("Deleted");
  }).catch((err) => {
    alert("Error: " + err.message);
  });
}
