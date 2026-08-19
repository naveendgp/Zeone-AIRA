import {
  Building2, Car, Dumbbell, GraduationCap, HeartPulse, Scissors,
  Smartphone, Sparkles, Store, Stethoscope, UtensilsCrossed, type LucideIcon,
} from "lucide-react";
import type { BusinessType, PolicyKey } from "./schema";

/** Everything that changes downstream when a business type is picked. */
export interface Preset {
  label: string;
  icon: LucideIcon;
  blurb: string;
  /** What one member of staff is called here. null = this business doesn't need staff. */
  staffNoun: string | null;
  roleLabel: string;
  rolePlaceholder: string;
  /** Whether a per-person fee makes sense (a doctor charges; a waiter doesn't). */
  hasFee: boolean;
  serviceNoun: string;
  sampleServices: { name: string; price: string }[];
  sampleFaq: { q: string; a: string };
  /** Policies worth surfacing first for this trade. */
  policyOrder: PolicyKey[];
}

export const PRESETS: Record<BusinessType, Preset> = {
  clinic: {
    label: "Clinic", icon: Stethoscope, blurb: "Consultations, tests, appointments",
    staffNoun: "Doctor", roleLabel: "Speciality", rolePlaceholder: "General medicine",
    hasFee: true, serviceNoun: "Service",
    sampleServices: [
      { name: "General consultation", price: "300" },
      { name: "Blood test", price: "400" },
      { name: "ECG", price: "300" },
    ],
    sampleFaq: { q: "How soon do I get my report?", a: "Most reports are ready the same day by evening." },
    policyOrder: ["parking", "card", "homeCollection", "insurance", "wheelchair", "emergency"],
  },
  hospital: {
    label: "Hospital", icon: HeartPulse, blurb: "Departments, admissions, emergency",
    staffNoun: "Doctor", roleLabel: "Department", rolePlaceholder: "Cardiology",
    hasFee: true, serviceNoun: "Service",
    sampleServices: [
      { name: "OP consultation", price: "500" },
      { name: "Master health checkup", price: "2500" },
      { name: "X-ray", price: "350" },
    ],
    sampleFaq: { q: "Do you have 24 hour emergency?", a: "Yes, our emergency ward is open 24 hours." },
    policyOrder: ["emergency", "insurance", "parking", "wheelchair", "card", "homeCollection"],
  },
  dental: {
    label: "Dental", icon: Stethoscope, blurb: "Cleaning, braces, implants",
    staffNoun: "Dentist", roleLabel: "Speciality", rolePlaceholder: "Orthodontics",
    hasFee: true, serviceNoun: "Treatment",
    sampleServices: [
      { name: "Consultation", price: "300" },
      { name: "Teeth cleaning", price: "1200" },
      { name: "Root canal", price: "5000" },
    ],
    sampleFaq: { q: "Does root canal need more than one visit?", a: "Usually two visits, about a week apart." },
    policyOrder: ["parking", "card", "insurance", "wheelchair", "emergency", "homeCollection"],
  },
  salon: {
    label: "Salon & Spa", icon: Scissors, blurb: "Hair, beauty, grooming",
    staffNoun: "Stylist", roleLabel: "Speciality", rolePlaceholder: "Hair colouring",
    hasFee: false, serviceNoun: "Service",
    sampleServices: [
      { name: "Haircut", price: "300" },
      { name: "Hair colour", price: "1500" },
      { name: "Facial", price: "800" },
    ],
    sampleFaq: { q: "Do I need an appointment?", a: "Walk-ins are welcome, but booking means no waiting." },
    policyOrder: ["parking", "card", "wheelchair", "homeCollection", "insurance", "emergency"],
  },
  restaurant: {
    label: "Restaurant", icon: UtensilsCrossed, blurb: "Tables, orders, takeaway",
    staffNoun: null, roleLabel: "Role", rolePlaceholder: "Manager",
    hasFee: false, serviceNoun: "Offering",
    sampleServices: [
      { name: "Table booking", price: "" },
      { name: "Takeaway", price: "" },
      { name: "Party hall", price: "5000" },
    ],
    sampleFaq: { q: "Do you take table bookings?", a: "Yes, for parties of four or more." },
    policyOrder: ["parking", "card", "wheelchair", "emergency", "insurance", "homeCollection"],
  },
  retail: {
    label: "Retail store", icon: Store, blurb: "Stock, timings, offers",
    staffNoun: null, roleLabel: "Role", rolePlaceholder: "Store manager",
    hasFee: false, serviceNoun: "Category",
    sampleServices: [
      { name: "Home delivery", price: "" },
      { name: "Gift wrapping", price: "" },
    ],
    sampleFaq: { q: "Can I return an item?", a: "Yes, within 7 days with the bill." },
    policyOrder: ["parking", "card", "wheelchair", "homeCollection", "insurance", "emergency"],
  },
  mobile: {
    label: "Mobile store", icon: Smartphone, blurb: "Sales, service, accessories",
    staffNoun: null, roleLabel: "Role", rolePlaceholder: "Service engineer",
    hasFee: false, serviceNoun: "Service",
    sampleServices: [
      { name: "Screen replacement", price: "2500" },
      { name: "Battery replacement", price: "1200" },
      { name: "Software service", price: "500" },
    ],
    sampleFaq: { q: "How long does a screen replacement take?", a: "About two hours if the part is in stock." },
    policyOrder: ["card", "parking", "wheelchair", "homeCollection", "insurance", "emergency"],
  },
  gym: {
    label: "Gym & Fitness", icon: Dumbbell, blurb: "Memberships, trainers, classes",
    staffNoun: "Trainer", roleLabel: "Speciality", rolePlaceholder: "Strength training",
    hasFee: false, serviceNoun: "Plan",
    sampleServices: [
      { name: "Monthly membership", price: "1500" },
      { name: "Personal training", price: "5000" },
      { name: "Trial day pass", price: "200" },
    ],
    sampleFaq: { q: "Is there a trial session?", a: "Yes, a one-day trial pass for ₹200." },
    policyOrder: ["parking", "card", "wheelchair", "insurance", "homeCollection", "emergency"],
  },
  service: {
    label: "Service centre", icon: Car, blurb: "Repairs, servicing, pickup",
    staffNoun: "Technician", roleLabel: "Speciality", rolePlaceholder: "Two wheeler",
    hasFee: false, serviceNoun: "Service",
    sampleServices: [
      { name: "General service", price: "1200" },
      { name: "Oil change", price: "600" },
      { name: "Pickup & drop", price: "" },
    ],
    sampleFaq: { q: "Do you pick up the vehicle?", a: "Yes, pickup and drop within the city." },
    policyOrder: ["parking", "card", "homeCollection", "wheelchair", "insurance", "emergency"],
  },
  other: {
    label: "Something else", icon: Sparkles, blurb: "Tell us what you do",
    staffNoun: "Team member", roleLabel: "Role", rolePlaceholder: "Manager",
    hasFee: false, serviceNoun: "Service",
    // No presets to offer — we genuinely don't know this trade, so we don't pretend to.
    sampleServices: [],
    sampleFaq: { q: "What are your timings?", a: "We're open through the week — call any time during working hours." },
    policyOrder: ["parking", "card", "wheelchair", "homeCollection", "insurance", "emergency"],
  },
  education: {
    label: "Education", icon: GraduationCap, blurb: "Courses, batches, admissions",
    staffNoun: "Teacher", roleLabel: "Subject", rolePlaceholder: "Mathematics",
    hasFee: true, serviceNoun: "Course",
    sampleServices: [
      { name: "Spoken English", price: "3000" },
      { name: "NEET coaching", price: "25000" },
    ],
    sampleFaq: { q: "When does the next batch start?", a: "New batches start on the first Monday of every month." },
    policyOrder: ["parking", "card", "wheelchair", "insurance", "homeCollection", "emergency"],
  },
};

export const FALLBACK_PRESET: Preset = PRESETS.clinic;

export const POLICY_META: Record<PolicyKey, { label: string; hint: string; icon: LucideIcon }> = {
  parking: { label: "Parking", hint: "Two-wheeler and car parking available", icon: Car },
  card: { label: "Card payment", hint: "Cards and UPI accepted", icon: Building2 },
  wheelchair: { label: "Wheelchair access", hint: "Ramp and ground-floor access", icon: HeartPulse },
  insurance: { label: "Insurance", hint: "Which insurers you accept", icon: Building2 },
  homeCollection: { label: "Home collection", hint: "We collect samples at home", icon: Store },
  emergency: { label: "Emergency service", hint: "After hours or urgent help", icon: HeartPulse },
};

/** Deterministic pick so the same business always gets the same assistant. */
/** Every Zeone receptionist is AIRA — one name customers learn to recognise. */
export const ASSISTANT_NAME = "AIRA";

/**
 * The spoken form. Tamil TTS reads all-caps Latin inside a Tamil sentence letter by letter
 * ("ay-eye-aar-ay"), so anything the assistant says aloud uses the Tamil spelling — matching
 * the convention already in profiles/*.json (பிரியா, தீபா). "AIRA" stays the written name.
 */
export const ASSISTANT_NAME_TA = "ஐரா";

export function assistantNameFor(_type?: BusinessType, _businessName?: string): string {
  return ASSISTANT_NAME;
}

/** What to call this business in prose — respects the free-text "other" answer. */
export function typeLabel(type: BusinessType | undefined, otherType?: string): string {
  if (type === "other") return otherType?.trim() || "Business";
  return type ? PRESETS[type].label : "Business";
}

/* ------------------------------- sample fills ------------------------------ */
/**
 * A believable, fully-formed business per niche, for owners who want to see the
 * product before doing data entry. "other" is deliberately absent — we have no
 * template for an unknown trade and won't invent one.
 */
export interface SampleFill {
  address: string;
  phone: string;
  staff: { name: string; role: string; fee: string; hours: string }[];
  policies: PolicyKey[];
  faqs: { q: string; a: string }[];
}

export const SAMPLES: Partial<Record<BusinessType, SampleFill>> = {
  clinic: {
    address: "12, North Usman Road, T. Nagar, Chennai",
    phone: "+91 98400 12345",
    staff: [
      { name: "Dr. Rajesh", role: "General medicine", fee: "300", hours: "9 AM – 1 PM, Mon to Sat" },
      { name: "Dr. Meena", role: "Paediatrics", fee: "400", hours: "2 PM – 6 PM, Mon to Fri" },
    ],
    policies: ["parking", "card", "homeCollection"],
    faqs: [
      { q: "How soon do I get my report?", a: "Most reports are ready the same day by evening." },
      { q: "Do I need an appointment?", a: "Walk-ins are welcome, but booking means far less waiting." },
    ],
  },
  hospital: {
    address: "45, Poonamallee High Road, Kilpauk, Chennai",
    phone: "+91 44 2641 0000",
    staff: [
      { name: "Dr. Suresh", role: "Cardiology", fee: "700", hours: "10 AM – 4 PM, Mon to Sat" },
      { name: "Dr. Lakshmi", role: "Obstetrics", fee: "600", hours: "9 AM – 2 PM, Mon to Fri" },
    ],
    policies: ["emergency", "insurance", "parking", "wheelchair", "card"],
    faqs: [
      { q: "Do you have 24 hour emergency?", a: "Yes, our emergency ward is open 24 hours, every day." },
      { q: "Which insurance do you accept?", a: "Star Health, ICICI Lombard and most cashless TPA cards." },
    ],
  },
  dental: {
    address: "21, Bazaar Road, Mylapore, Chennai",
    phone: "+91 98407 33221",
    staff: [{ name: "Dr. Anand", role: "Implants & braces", fee: "400", hours: "10 AM – 7 PM, Mon to Sat" }],
    policies: ["parking", "card"],
    faqs: [
      { q: "Does a root canal need more than one visit?", a: "Usually two visits, about a week apart." },
      { q: "Do you do EMI for braces?", a: "Yes, we offer EMI over 3 or 6 months on treatments above ₹15,000." },
    ],
  },
  salon: {
    address: "8, 100 Feet Road, Vadapalani, Chennai",
    phone: "+91 90030 55112",
    staff: [
      { name: "Priya", role: "Hair colouring", fee: "", hours: "10 AM – 8 PM, Tue to Sun" },
      { name: "Rekha", role: "Bridal makeup", fee: "", hours: "By appointment" },
    ],
    policies: ["parking", "card"],
    faqs: [
      { q: "Do I need an appointment?", a: "Walk-ins are welcome, but weekends get busy — booking is safer." },
      { q: "Do you do bridal packages?", a: "Yes, bridal packages start at ₹12,000 including trial." },
    ],
  },
  restaurant: {
    address: "3, East Coast Road, Thiruvanmiyur, Chennai",
    phone: "+91 44 2452 8899",
    staff: [],
    policies: ["parking", "card", "wheelchair"],
    faqs: [
      { q: "Do you take table bookings?", a: "Yes, for parties of four or more. Weekends fill up by 7 PM." },
      { q: "Do you have parking?", a: "Yes, we have covered parking for about 20 cars." },
    ],
  },
  retail: {
    address: "56, Ranganathan Street, T. Nagar, Chennai",
    phone: "+91 98410 77665",
    staff: [],
    policies: ["card", "parking", "homeCollection"],
    faqs: [
      { q: "Can I return an item?", a: "Yes, within 7 days with the bill, unused and in original packaging." },
      { q: "Do you deliver?", a: "Free home delivery within 5 km on orders above ₹1,000." },
    ],
  },
  mobile: {
    address: "17, Ritchie Street, Mount Road, Chennai",
    phone: "+91 91766 40012",
    staff: [],
    policies: ["card", "parking"],
    faqs: [
      { q: "How long does a screen replacement take?", a: "About two hours if the part is in stock." },
      { q: "Is there a warranty on repairs?", a: "Yes, 3 months' warranty on all parts we replace." },
    ],
  },
  gym: {
    address: "9, Velachery Main Road, Velachery, Chennai",
    phone: "+91 99401 22334",
    staff: [
      { name: "Karthik", role: "Strength training", fee: "", hours: "6 AM – 10 AM, 5 PM – 9 PM" },
      { name: "Divya", role: "Zumba & cardio", fee: "", hours: "7 AM – 11 AM, Mon to Sat" },
    ],
    policies: ["parking", "card"],
    faqs: [
      { q: "Is there a trial session?", a: "Yes, a one-day trial pass for ₹200, adjustable against membership." },
      { q: "What are your peak hours?", a: "6–9 AM and 6–9 PM are busiest. Afternoons are quiet." },
    ],
  },
  service: {
    address: "88, GST Road, Chromepet, Chennai",
    phone: "+91 93810 45678",
    staff: [{ name: "Murugan", role: "Two wheeler", fee: "", hours: "9 AM – 7 PM, Mon to Sat" }],
    policies: ["parking", "card", "homeCollection"],
    faqs: [
      { q: "Do you pick up the vehicle?", a: "Yes, free pickup and drop within the city." },
      { q: "How long does a general service take?", a: "Same day if you drop it before 11 AM." },
    ],
  },
  education: {
    address: "34, Anna Nagar 2nd Avenue, Chennai",
    phone: "+91 98844 90011",
    staff: [
      { name: "Mr. Ravi", role: "Mathematics", fee: "", hours: "5 PM – 8 PM, Mon to Fri" },
      { name: "Ms. Anitha", role: "Physics", fee: "", hours: "6 PM – 9 PM, Mon to Sat" },
    ],
    policies: ["parking", "card"],
    faqs: [
      { q: "When does the next batch start?", a: "New batches start on the first Monday of every month." },
      { q: "Is there a demo class?", a: "Yes, the first class is free so you can decide." },
    ],
  },
};

/**
 * The opening line, word-for-word what agent.py speaks over TTS before the caller says
 * anything (`வணக்கம்! {business}, நான் {assistant} பேசுறேன். சொல்லுங்க, எப்படி உதவலாம்?`).
 * Kept identical so the web trial sounds like the real phone line, not a different product.
 */
export function greetingFor(businessName: string): string {
  const biz = businessName?.trim() || "எங்க அலுவலகம்";
  return `வணக்கம்! ${biz}, நான் ${ASSISTANT_NAME_TA} பேசுறேன். சொல்லுங்க, எப்படி உதவலாம்?`;
}

/* --------------------- category-specific questions ----------------------- */
/**
 * The questions real callers ask a business of this type, in the caller's own words.
 * The owner supplies the answer, and that answer becomes something the assistant can say.
 *
 * Ids are semantic and stable: rewording a question must never orphan an answer.
 */
export interface CategoryQuestion {
  id: string;
  /** What the caller asks. */
  ask: string;
  /** Hint for the owner's reply. */
  placeholder?: string;
}

export const CATEGORY_QUESTIONS: Record<BusinessType, CategoryQuestion[]> = {
  clinic: [
    { id: "doctorToday", ask: "Is the doctor available today?", placeholder: "Dr. Rajesh is in 9 AM–1 PM, Mon to Sat" },
    { id: "tokenOrAppointment", ask: "Do I need a token or can I book an appointment?", placeholder: "Both — booking means less waiting" },
    { id: "consultFee", ask: "How much is the general consultation fee?", placeholder: "₹300" },
    { id: "bloodSugarTests", ask: "Do you offer blood tests or sugar tests?", placeholder: "Yes — blood test ₹400, sugar test ₹150" },
    { id: "sundayOpen", ask: "Are you open on Sundays?", placeholder: "Closed on Sundays" },
  ],
  hospital: [
    { id: "cardiologyTiming", ask: "When is the cardiology doctor available?", placeholder: "Dr. Suresh, 10 AM–4 PM, Mon to Sat" },
    { id: "ctMri", ask: "Do you have CT scan or MRI facilities?", placeholder: "CT yes, MRI no" },
    { id: "insuranceCards", ask: "Do you accept health insurance cards?", placeholder: "Star Health, CGHS — cashless" },
    { id: "emergency24", ask: "Is the emergency department open 24 hours?", placeholder: "Yes, 24 hours every day" },
    { id: "roomBooking", ask: "Can I book a room if I am coming from another district?", placeholder: "Yes, call a day ahead" },
  ],
  dental: [
    { id: "bracesCost", ask: "How much does it cost to get braces?", placeholder: "From ₹25,000, EMI available" },
    { id: "rootCanalAppointment", ask: "Can I book an appointment for a root canal?", placeholder: "Yes — usually two visits" },
    { id: "cleaningCost", ask: "How much do you charge for teeth cleaning?", placeholder: "₹1,200" },
    { id: "childCheckup", ask: "Do you provide dental check-ups for children?", placeholder: "Yes, from age 3" },
    { id: "severePainToday", ask: "I have severe tooth pain. Can I see the doctor today?", placeholder: "Yes, come in — we keep slots for pain cases" },
  ],
  salon: [
    { id: "bridalPackage", ask: "How much is your bridal makeup package?", placeholder: "From ₹12,000 including trial" },
    { id: "engagementPackage", ask: "Do you have a package for engagement makeup?", placeholder: "Yes, ₹6,000" },
    { id: "haircutAppointment", ask: "Do I need an appointment for a haircut?", placeholder: "Walk-ins fine, weekends get busy" },
    { id: "homeService", ask: "Do you provide home service?", placeholder: "Bridal only, within the city" },
    { id: "sundayMorning", ask: "Can I get an appointment on Sunday morning?", placeholder: "Yes, we open 9 AM Sundays" },
  ],
  restaurant: [
    { id: "biryaniToday", ask: "Do you have chicken biryani today?", placeholder: "Yes, every day from 12 PM" },
    { id: "groupTable", ask: "We are coming as a group of 10. Do you have a table available?", placeholder: "Yes, please call ahead for groups" },
    { id: "takeaway", ask: "Do you offer takeaway or parcel service?", placeholder: "Yes, parcel available all day" },
    { id: "deliveryAreas", ask: "Which areas do you deliver to?", placeholder: "Within 5 km — Adyar, Thiruvanmiyur" },
    { id: "catering50", ask: "Do you provide catering for a function with 50 people?", placeholder: "Yes, order two days ahead" },
  ],
  retail: [
    { id: "modelInStock", ask: "Is this model currently in stock?", placeholder: "Tell callers how to check — or that stock changes daily" },
    { id: "currentOffers", ask: "Are there any offers available right now?", placeholder: "10% off on festival collection" },
    { id: "homeDelivery", ask: "Do you provide home delivery?", placeholder: "Free within 5 km" },
    { id: "upiCard", ask: "Do you accept UPI or card payments?", placeholder: "Yes, UPI, card and cash" },
    { id: "exchangePolicy", ask: "Can I exchange the product if I change my mind?", placeholder: "Exchange within 7 days with the bill" },
  ],
  mobile: [
    { id: "iphoneStock", ask: "Do you have the iPhone 15 or 16 in stock?", placeholder: "Both usually in stock — call to confirm colour" },
    { id: "exchangeOldPhone", ask: "Do you accept old phones for exchange?", placeholder: "Yes, value depends on condition" },
    { id: "emi", ask: "Can I buy a phone on EMI?", placeholder: "Yes, 3/6/9 months on most cards" },
    { id: "currentOffer", ask: "What offer do you currently have on this phone?", placeholder: "Bank card discounts, changes weekly" },
    { id: "screenReplacementCost", ask: "How much does screen replacement cost?", placeholder: "From ₹2,500 depending on model" },
  ],
  gym: [
    { id: "monthlyFee", ask: "How much is the monthly membership fee?", placeholder: "₹1,500 a month" },
    { id: "womenTimings", ask: "Do you have separate timings for women?", placeholder: "Yes, 11 AM–1 PM" },
    { id: "trialSession", ask: "Can I try a trial session before joining?", placeholder: "Yes, one-day pass ₹200" },
    { id: "personalTrainers", ask: "Do you have personal trainers?", placeholder: "Yes, ₹5,000 a month" },
    { id: "open6am", ask: "Are you open at 6 AM?", placeholder: "Yes, we open 5:30 AM" },
  ],
  service: [
    { id: "serviceDuration", ask: "How long will it take to service my vehicle?", placeholder: "General service, about 3 hours" },
    { id: "pickupDrop", ask: "Do you provide pickup and drop service?", placeholder: "Yes, free within the city" },
    { id: "sparePartStock", ask: "Do you have the required spare part in stock?", placeholder: "Common parts yes; others in 2 days" },
    { id: "warrantyService", ask: "Can you service the vehicle under warranty?", placeholder: "Yes, bring the service book" },
    { id: "readyWhen", ask: "If I give the vehicle today, when will it be ready?", placeholder: "Same day if dropped before 11 AM" },
  ],
  education: [
    { id: "admissionStart", ask: "When does admission start for this course?", placeholder: "Admissions open in June" },
    { id: "feesEmi", ask: "How much are the fees, and do you offer EMI?", placeholder: "₹25,000 — payable in 3 instalments" },
    { id: "hostel", ask: "Do you provide hostel facilities?", placeholder: "No hostel, but we can suggest nearby" },
    { id: "placement", ask: "Do you provide placement assistance after the course?", placeholder: "Yes, interview prep and referrals" },
    { id: "managementQuota", ask: "Is admission available through management quota?", placeholder: "Answer honestly — callers ask this a lot" },
  ],
  // Generated per business by /api/questions, since we can't know an unlisted trade.
  other: [],
};

/** Static list for known categories; Gemini-generated ones for "Something else". */
export function questionsFor(draft: {
  type?: BusinessType;
  generatedQuestions?: { id: string; ask: string }[];
}): CategoryQuestion[] {
  if (!draft.type) return [];
  if (draft.type === "other") return draft.generatedQuestions ?? [];
  return CATEGORY_QUESTIONS[draft.type];
}

/** Answers used by the "fill it in with sample data" shortcut. */
export const SAMPLE_PROFILES: Partial<Record<BusinessType, Record<string, string>>> = {
  clinic: {
    doctorToday: "Dr. Rajesh is in 9 AM–1 PM, Dr. Meena 2 PM–6 PM",
    tokenOrAppointment: "Both — booking means far less waiting",
    consultFee: "₹300 for general consultation",
    bloodSugarTests: "Yes — blood test ₹400, sugar test ₹150",
    sundayOpen: "Closed on Sundays",
  },
  hospital: {
    cardiologyTiming: "Dr. Suresh, 10 AM–4 PM, Mon to Sat",
    ctMri: "CT scan available; no MRI",
    insuranceCards: "Star Health, ICICI Lombard and most cashless TPA cards",
    emergency24: "Yes, emergency is open 24 hours",
    roomBooking: "Yes, call a day ahead and we'll hold a room",
  },
  dental: {
    bracesCost: "From ₹25,000, with EMI over 3 or 6 months",
    rootCanalAppointment: "Yes — usually two visits about a week apart",
    cleaningCost: "₹1,200",
    childCheckup: "Yes, we see children from age 3",
    severePainToday: "Yes, come in — we keep slots free for pain cases",
  },
  salon: {
    bridalPackage: "From ₹12,000 including a trial",
    engagementPackage: "Yes, ₹6,000",
    haircutAppointment: "Walk-ins are fine, but weekends get busy",
    homeService: "Bridal only, within the city",
    sundayMorning: "Yes, we open at 9 AM on Sundays",
  },
  restaurant: {
    biryaniToday: "Yes, chicken biryani every day from 12 PM",
    groupTable: "Yes — call ahead for groups of 8 or more",
    takeaway: "Yes, parcel available all day",
    deliveryAreas: "Within 5 km — Adyar, Thiruvanmiyur, Besant Nagar",
    catering50: "Yes, please order two days in advance",
  },
  retail: {
    modelInStock: "Stock changes daily — call and we'll check while you wait",
    currentOffers: "10% off on the festival collection",
    homeDelivery: "Free delivery within 5 km",
    upiCard: "Yes — UPI, card and cash",
    exchangePolicy: "Exchange within 7 days with the bill",
  },
  mobile: {
    iphoneStock: "Both usually in stock — call to confirm the colour",
    exchangeOldPhone: "Yes, value depends on the condition",
    emi: "Yes, EMI over 3, 6 or 9 months on most cards",
    currentOffer: "Bank card discounts — they change weekly",
    screenReplacementCost: "From ₹2,500 depending on the model",
  },
  gym: {
    monthlyFee: "₹1,500 a month",
    womenTimings: "Yes, 11 AM–1 PM is women only",
    trialSession: "Yes, a one-day trial pass for ₹200",
    personalTrainers: "Yes, personal training is ₹5,000 a month",
    open6am: "Yes, we open at 5:30 AM",
  },
  service: {
    serviceDuration: "General service takes about 3 hours",
    pickupDrop: "Yes, free pickup and drop within the city",
    sparePartStock: "Common parts in stock; others arrive in 2 days",
    warrantyService: "Yes, bring the service book",
    readyWhen: "Same day if you drop it before 11 AM",
  },
  education: {
    admissionStart: "Admissions open in June every year",
    feesEmi: "₹25,000, payable in 3 instalments",
    hostel: "No hostel of our own, but we can suggest nearby options",
    placement: "Yes, interview preparation and referrals",
    managementQuota: "No management quota — admission is on merit",
  },
};
