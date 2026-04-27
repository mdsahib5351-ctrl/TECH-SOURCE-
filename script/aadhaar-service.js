
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

const CLOUD_NAME = "dsnuatuc8";
const UPLOAD_PRESET = "ml_default";
const CLOUDINARY_API = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const $ = (id) => document.getElementById(id);
const digitsOnly = (value) => value.replace(/\D/g, "");
const isTenDigitMobile = (value) => /^[6-9]\d{9}$/.test(value);
const isAadhaar = (value) => /^\d{12}$/.test(value);
const todayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const maskAadhaar = (value) => value ? `XXXX XXXX ${value.slice(-4)}` : "";
const maskMobile = (value) => value ? `${value.slice(0,2)}XXXXXX${value.slice(-2)}` : "";

const state = {
  selectedService: "",
  appointmentData: {},
  submitting: false
};

const els = {
  homePage: $("homePage"),
  bookPage: $("bookPage"),
  trackPage: $("trackPage"),
  reschedulePage: $("reschedulePage"),
  step1: $("step1"),
  step2: $("step2"),
  step3: $("step3"),
  step4: $("step4"),
  s1: $("s1"),
  s2: $("s2"),
  s3: $("s3"),
  s4: $("s4"),
  nameInput: $("name"),
  mobileInput: $("mobile"),
  aadhaarInput: $("aadhaar"),
  serviceOptions: $("serviceOptions"),
  selectedServiceText: $("selectedServiceText"),
  withoutDocSection: $("withoutDocSection"),
  coSection: $("coSection"),
  mobileUpdateSection: $("mobileUpdateSection"),
  docSection: $("docSection"),
  appointmentDate: $("appointmentDate"),
  appointmentTime: $("appointmentTime"),
  timeSlots: $("timeSlots"),
  newAddress: $("newAddress"),
  withoutDocNote: $("withoutDocNote"),
  relationType: $("relationType"),
  coName: $("coName"),
  coAddress: $("coAddress"),
  oldMobile: $("oldMobile"),
  newMobile: $("newMobile"),
  docType: $("docType"),
  documentFile: $("documentFile"),
  docAddress: $("docAddress"),
  reviewBox: $("reviewBox"),
  finalId: $("finalId"),
  submitBtn: $("submitBtn"),
  trackId: $("trackId"),
  trackResult: $("trackResult"),
  resId: $("resId"),
  resDate: $("resDate"),
  resTime: $("resTime"),
  resTimeSlots: $("resTimeSlots"),
  resResult: $("resResult")
};

const slotList = [
  "10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM",
  "12:30 PM","02:00 PM","02:30 PM","03:00 PM","03:30 PM"
];

els.appointmentDate.min = todayISO();
els.resDate.min = todayISO();

[els.mobileInput, els.aadhaarInput, els.oldMobile, els.newMobile].forEach(input => {
  input.addEventListener("input", () => {
    input.value = digitsOnly(input.value).slice(0, Number(input.maxLength) || 12);
  });
});

function showMessage(target, message, type = "warn"){
  target.innerHTML = "";
  const div = document.createElement("div");
  div.className = `status ${type}`;
  div.textContent = message;
  target.appendChild(div);
}

function addReviewRow(container, label, value){
  const p = document.createElement("p");
  const b = document.createElement("b");
  b.textContent = `${label}: `;
  p.appendChild(b);
  p.appendChild(document.createTextNode(value || "-"));
  container.appendChild(p);
}

function generateAppointmentId(){
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString().slice(-4);
  return `TS-${Date.now().toString().slice(-6)}${random}`;
}

function validateFile(file){
  if(!file) return "Document upload karo";
  const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
  if(!allowed) return "Sirf image ya PDF upload karo";
  if(file.size > MAX_FILE_SIZE) return "Document 10 MB se chhota hona chahiye";
  return "";
}

async function uploadToCloudinary(file){
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_API, { method:"POST", body:formData });
  const data = await res.json().catch(() => ({}));

  if(!res.ok){
    throw new Error(data.error?.message || "Cloudinary upload failed. Upload preset check karo.");
  }

  return data.secure_url;
}

function getServiceExtraData(){
  if(state.selectedService === "Address Without Documents"){
    if(!els.newAddress.value.trim()) return { error:"New address enter karo" };
    return {
      data:{
        newAddress: els.newAddress.value.trim(),
        note: els.withoutDocNote.value.trim()
      },
      rows:[
        ["New Address", els.newAddress.value.trim()],
        ["Note", els.withoutDocNote.value.trim() || "-"]
      ]
    };
  }

  if(state.selectedService === "C/O Update"){
    if(!els.relationType.value) return { error:"Relation select karo" };
    if(!els.coName.value.trim()) return { error:"C/O name enter karo" };
    return {
      data:{
        relationType: els.relationType.value,
        coName: els.coName.value.trim(),
        coAddress: els.coAddress.value.trim()
      },
      rows:[
        ["Relation", els.relationType.value],
        ["C/O Name", els.coName.value.trim()],
        ["Address", els.coAddress.value.trim() || "-"]
      ]
    };
  }

  if(state.selectedService === "Mobile Number Update"){
    if(!isTenDigitMobile(els.oldMobile.value.trim())) return { error:"Old mobile valid enter karo" };
    if(!isTenDigitMobile(els.newMobile.value.trim())) return { error:"New mobile valid enter karo" };
    if(els.oldMobile.value.trim() === els.newMobile.value.trim()) return { error:"New mobile old mobile se different hona chahiye" };
    return {
      data:{
        oldMobile: els.oldMobile.value.trim(),
        newMobile: els.newMobile.value.trim()
      },
      rows:[
        ["Old Mobile", maskMobile(els.oldMobile.value.trim())],
        ["New Mobile", maskMobile(els.newMobile.value.trim())]
      ]
    };
  }

  const fileError = validateFile(els.documentFile.files[0]);
  if(!els.docType.value) return { error:"Document type select karo" };
  if(fileError) return { error:fileError };
  if(!els.docAddress.value.trim()) return { error:"New address enter karo" };

  return {
    data:{
      docType: els.docType.value,
      fileName: els.documentFile.files[0].name,
      docAddress: els.docAddress.value.trim()
    },
    rows:[
      ["Document Type", els.docType.value],
      ["Uploaded File", els.documentFile.files[0].name],
      ["New Address", els.docAddress.value.trim()]
    ]
  };
}

function renderReview(rows){
  els.reviewBox.innerHTML = "";
  rows.forEach(([label,value]) => addReviewRow(els.reviewBox, label, value));
}

function renderSlots(container, hiddenInput, selectedDate){
  hiddenInput.value = "";
  container.innerHTML = "";

  if(!selectedDate){
    container.innerHTML = `<p style="grid-column:1/-1;color:#777;">Please select date first</p>`;
    return;
  }

  const isToday = selectedDate === todayISO();
  const now = new Date();

  slotList.forEach(slot => {
    const div = document.createElement("button");
    div.type = "button";
    div.className = "time-slot";
    div.textContent = slot;

    const disabled = isToday && isSlotPassed(slot, now);
    if(disabled){
      div.classList.add("disabled");
      div.disabled = true;
      div.title = "This slot has already passed";
    }

    div.onclick = () => {
      container.querySelectorAll(".time-slot").forEach(s => s.classList.remove("active"));
      div.classList.add("active");
      hiddenInput.value = slot;
    };

    container.appendChild(div);
  });

  if(!container.querySelector(".time-slot:not(.disabled)")){
    container.innerHTML = `<p style="grid-column:1/-1;color:#777;">Aaj ke slots khatam ho gaye. Please another date select karo.</p>`;
  }
}

function isSlotPassed(slot, now){
  const [time, meridiem] = slot.split(" ");
  const [hourRaw, minuteRaw] = time.split(":").map(Number);
  let hour = hourRaw;
  if(meridiem === "PM" && hour !== 12) hour += 12;
  if(meridiem === "AM" && hour === 12) hour = 0;
  const slotDate = new Date(now);
  slotDate.setHours(hour, minuteRaw, 0, 0);
  return slotDate <= now;
}

function resetBookingForm(){
  state.selectedService = "";
  state.appointmentData = {};
  [
    els.nameInput,els.mobileInput,els.aadhaarInput,els.newAddress,els.withoutDocNote,
    els.coName,els.coAddress,els.oldMobile,els.newMobile,els.docAddress
  ].forEach(input => input.value = "");
  els.relationType.value = "";
  els.docType.value = "";
  els.documentFile.value = "";
  els.appointmentDate.value = "";
  els.appointmentTime.value = "";
  els.serviceOptions.classList.add("hidden");
  document.querySelectorAll(".opt").forEach(o => o.classList.remove("active"));
  renderSlots(els.timeSlots, els.appointmentTime, "");
}

window.handleCardKey = function(event, fn){
  if(event.key === "Enter" || event.key === " "){
    event.preventDefault();
    fn();
  }
};

window.handleServiceKey = function(event, el, service){
  if(event.key === "Enter" || event.key === " "){
    event.preventDefault();
    selectService(el, service);
  }
};

window.hideAll = function(){
  els.homePage.classList.add("hidden");
  els.bookPage.classList.add("hidden");
  els.trackPage.classList.add("hidden");
  els.reschedulePage.classList.add("hidden");
};

window.goHome = function(){
  hideAll();
  els.homePage.classList.remove("hidden");
};

window.openBook = function(){
  hideAll();
  resetBookingForm();
  els.bookPage.classList.remove("hidden");
  showOnlyStep(1);
};

window.openTrack = function(){
  hideAll();
  els.trackResult.innerHTML = "";
  els.trackPage.classList.remove("hidden");
};

window.openReschedule = function(){
  hideAll();
  els.resResult.innerHTML = "";
  els.resTime.value = "";
  renderSlots(els.resTimeSlots, els.resTime, els.resDate.value);
  els.reschedulePage.classList.remove("hidden");
};

window.showOnlyStep = function(n){
  [els.step1, els.step2, els.step3, els.step4].forEach(step => step.classList.add("hidden"));
  [els.s1, els.s2, els.s3, els.s4].forEach(step => step.className = "step");

  if(n === 1){
    els.step1.classList.remove("hidden");
    els.s1.classList.add("active");
  }
  if(n === 2){
    els.step2.classList.remove("hidden");
    els.s1.classList.add("done");
    els.s2.classList.add("active");
  }
  if(n === 3){
    els.step3.classList.remove("hidden");
    els.s1.classList.add("done");
    els.s2.classList.add("done");
    els.s3.classList.add("active");
  }
  if(n === 4){
    els.step4.classList.remove("hidden");
    els.s1.classList.add("done");
    els.s2.classList.add("done");
    els.s3.classList.add("done");
    els.s4.classList.add("active");
  }
};

window.showServices = function(){
  els.aadhaarInput.value = digitsOnly(els.aadhaarInput.value).slice(0, 12);
  if(isAadhaar(els.aadhaarInput.value.trim())){
    els.serviceOptions.classList.remove("hidden");
  }else{
    els.serviceOptions.classList.add("hidden");
    state.selectedService = "";
    document.querySelectorAll(".opt").forEach(o => o.classList.remove("active"));
  }
};

window.selectService = function(el, service){
  document.querySelectorAll(".opt").forEach(o => o.classList.remove("active"));
  el.classList.add("active");
  state.selectedService = service;
};

window.goStep2 = function(){
  const name = els.nameInput.value.trim();
  const mobile = els.mobileInput.value.trim();
  const aadhaar = els.aadhaarInput.value.trim();

  if(name.length < 3) return alert("Valid full name enter karo");
  if(!isTenDigitMobile(mobile)) return alert("Valid 10 digit Indian mobile number enter karo");
  if(!isAadhaar(aadhaar)) return alert("Valid 12 digit Aadhaar number enter karo");
  if(!state.selectedService) return alert("Service select karo");

  els.selectedServiceText.textContent = state.selectedService;

  [els.withoutDocSection, els.coSection, els.mobileUpdateSection, els.docSection].forEach(section => section.classList.add("hidden"));

  if(state.selectedService === "Address Without Documents"){
    els.withoutDocSection.classList.remove("hidden");
  }else if(state.selectedService === "C/O Update"){
    els.coSection.classList.remove("hidden");
  }else if(state.selectedService === "Mobile Number Update"){
    els.mobileUpdateSection.classList.remove("hidden");
  }else{
    els.docSection.classList.remove("hidden");
  }

  showOnlyStep(2);
};

window.backStep1 = function(){ showOnlyStep(1); };
window.backStep2 = function(){ showOnlyStep(2); };

window.goReview = function(){
  if(!els.appointmentDate.value) return alert("Appointment date select karo");
  if(els.appointmentDate.value < todayISO()) return alert("Past date allowed nahi hai");
  if(!els.appointmentTime.value) return alert("Appointment time select karo");

  const extra = getServiceExtraData();
  if(extra.error) return alert(extra.error);

  state.appointmentData = {
    appointmentId: generateAppointmentId(),
    name: els.nameInput.value.trim(),
    mobile: els.mobileInput.value.trim(),
    aadhaar: els.aadhaarInput.value.trim(),
    service: state.selectedService,
    appointmentDate: els.appointmentDate.value,
    appointmentTime: els.appointmentTime.value,
    status: "Pending",
    documentUrl: "",
    ...extra.data
  };

  renderReview([
    ["Appointment ID", state.appointmentData.appointmentId],
    ["Name", state.appointmentData.name],
    ["Mobile", maskMobile(state.appointmentData.mobile)],
    ["Aadhaar", maskAadhaar(state.appointmentData.aadhaar)],
    ["Service", state.appointmentData.service],
    ...extra.rows,
    ["Date", state.appointmentData.appointmentDate],
    ["Time", state.appointmentData.appointmentTime],
    ["Status", state.appointmentData.status]
  ]);

  showOnlyStep(3);
};

window.submitAppointment = async function(){
  if(state.submitting) return;

  try{
    state.submitting = true;
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = "Uploading / Saving...";

    if(state.selectedService === "Address With Documents"){
      state.appointmentData.documentUrl = await uploadToCloudinary(els.documentFile.files[0]);
    }

    await db.collection("appointments").add({
      ...state.appointmentData,
      aadhaarMasked: maskAadhaar(state.appointmentData.aadhaar),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    downloadPDF();
    els.finalId.textContent = state.appointmentData.appointmentId;
    showOnlyStep(4);
  }catch(error){
    alert("Error: " + error.message);
    console.error(error);
  }finally{
    state.submitting = false;
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = "Submit & Download PDF";
  }
};

window.downloadPDF = function(){
  if(!state.appointmentData.appointmentId){
    alert("PDF ke liye appointment data available nahi hai");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  let y = 20;

  const addLine = (label, value) => {
    const text = `${label}: ${value || "-"}`;
    const lines = pdf.splitTextToSize(text, 170);
    pdf.text(lines, 20, y);
    y += lines.length * 7 + 2;
    if(y > 275){
      pdf.addPage();
      y = 20;
    }
  };

  pdf.setFontSize(16);
  pdf.text("Aadhaar Service Appointment", 20, y);
  y += 12;

  pdf.setFontSize(11);
  addLine("Appointment ID", state.appointmentData.appointmentId);
  addLine("Name", state.appointmentData.name);
  addLine("Mobile", maskMobile(state.appointmentData.mobile));
  addLine("Aadhaar", maskAadhaar(state.appointmentData.aadhaar));
  addLine("Service", state.appointmentData.service);
  addLine("Date", state.appointmentData.appointmentDate);
  addLine("Time", state.appointmentData.appointmentTime);
  addLine("Status", state.appointmentData.status);

  if(state.appointmentData.newAddress) addLine("New Address", state.appointmentData.newAddress);
  if(state.appointmentData.note) addLine("Note", state.appointmentData.note);
  if(state.appointmentData.oldMobile){
    addLine("Old Mobile", maskMobile(state.appointmentData.oldMobile));
    addLine("New Mobile", maskMobile(state.appointmentData.newMobile));
  }
  if(state.appointmentData.coName){
    addLine("Relation", state.appointmentData.relationType);
    addLine("C/O Name", state.appointmentData.coName);
    addLine("Address", state.appointmentData.coAddress);
  }
  if(state.appointmentData.docType){
    addLine("Document Type", state.appointmentData.docType);
    addLine("Document File", state.appointmentData.fileName);
  }
  if(state.appointmentData.documentUrl) addLine("Document Link", "Saved in Firebase");

  pdf.save(`${state.appointmentData.appointmentId}.pdf`);
};

window.trackAppointment = async function(){
  try{
    const id = els.trackId.value.trim().toUpperCase();
    if(!id) return showMessage(els.trackResult, "Appointment ID enter karo", "warn");

    showMessage(els.trackResult, "Loading...", "warn");

    const snap = await db.collection("appointments").where("appointmentId", "==", id).get();

    if(snap.empty){
      showMessage(els.trackResult, "Appointment not found", "error");
      return;
    }

    els.trackResult.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const box = document.createElement("div");
      box.className = "review-box";
      [
        ["ID", data.appointmentId],
        ["Name", data.name],
        ["Service", data.service],
        ["Date", data.appointmentDate],
        ["Time", data.appointmentTime],
        ["Status", data.status]
      ].forEach(row => addReviewRow(box, row[0], row[1]));

      if(data.documentUrl){
        const p = document.createElement("p");
        const b = document.createElement("b");
        const a = document.createElement("a");
        b.textContent = "Document: ";
        a.href = data.documentUrl;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "Open Document";
        p.append(b, a);
        box.appendChild(p);
      }

      els.trackResult.appendChild(box);
    });
  }catch(error){
    showMessage(els.trackResult, `Firebase Error: ${error.message}`, "error");
  }
};

window.rescheduleAppointment = async function(){
  try{
    const id = els.resId.value.trim().toUpperCase();
    if(!id) return alert("Appointment ID enter karo");
    if(!els.resDate.value) return alert("New date select karo");
    if(els.resDate.value < todayISO()) return alert("Past date allowed nahi hai");
    if(!els.resTime.value) return alert("New time select karo");

    showMessage(els.resResult, "Loading...", "warn");

    const snap = await db.collection("appointments").where("appointmentId", "==", id).get();

    if(snap.empty){
      showMessage(els.resResult, "Appointment not found", "error");
      return;
    }

    const docSnap = snap.docs[0];
    await db.collection("appointments").doc(docSnap.id).update({
      appointmentDate: els.resDate.value,
      appointmentTime: els.resTime.value,
      status: "Rescheduled",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    els.resResult.innerHTML = "";
    const box = document.createElement("div");
    box.className = "review-box";
    addReviewRow(box, "Appointment Rescheduled", id);
    addReviewRow(box, "New Date", els.resDate.value);
    addReviewRow(box, "New Time", els.resTime.value);
    els.resResult.appendChild(box);
  }catch(error){
    showMessage(els.resResult, `Firebase Error: ${error.message}`, "error");
  }
};

window.renderTimeSlots = function(){
  renderSlots(els.timeSlots, els.appointmentTime, els.appointmentDate.value);
};

window.renderRescheduleSlots = function(){
  renderSlots(els.resTimeSlots, els.resTime, els.resDate.value);
};
