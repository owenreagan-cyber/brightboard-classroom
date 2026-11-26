import { HERO_JOBS, normalizeHeroJobs, type HeroJobsState } from "./hero-jobs";
import { mergeHeroAgency } from "./hero-agency-store";
import {
  companionStudentId,
  companionToHero,
  hasCompanionActivity,
  type CompanionJob,
  type CompanionStudent,
} from "./classroom-companion-store";

// Public Firebase web configuration used by Classroom Companion. No Firebase secret is shipped.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCDR31Z4bQ6f4vz9q_NsotF8Xyx61ZWyKE",
  authDomain: "classroom-jobs-4d74b.firebaseapp.com",
  projectId: "classroom-jobs-4d74b",
  storageBucket: "classroom-jobs-4d74b.firebasestorage.app",
  messagingSenderId: "330210280753",
  appId: "1:330210280753:web:784bbd04648e8c166ddc10",
};
const DATA_PATH = ["artifacts", "ua-jobs-app", "public", "data"] as const;

type CompanionMeta = Pick<HeroJobsState, "weekStart" | "history"> & { names: string[] };
export type CompanionConnection = {
  save: (before: HeroJobsState, after: HeroJobsState) => Promise<HeroJobsState>;
  close: () => void;
};

/** Browser-only, realtime bridge to the exact collections Classroom Companion reads and writes. */
export async function openClassroomCompanion(
  fallback: HeroJobsState,
  names: string[],
  onChange: (state: HeroJobsState) => void,
  onError: (message: string) => void,
): Promise<CompanionConnection> {
  const [{ initializeApp, getApps }, authModule, firestore] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = getApps().find((candidate) => candidate.name === "classroom-companion")
    ?? initializeApp(FIREBASE_CONFIG, "classroom-companion");
  const auth = authModule.getAuth(app);
  if (!auth.currentUser) await authModule.signInAnonymously(auth);
  const db = firestore.getFirestore(app);
  const jobsRef = firestore.collection(db, ...DATA_PATH, "jobs");
  const studentsRef = firestore.collection(db, ...DATA_PATH, "students");
  const metaRef = firestore.doc(db, ...DATA_PATH, "heroAgency", "current");

  const readStudents = async (): Promise<CompanionStudent[]> => (await firestore.getDocs(studentsRef)).docs.map((record) => {
    const data = record.data();
    return {
      id: record.id,
      name: typeof data["name"] === "string" ? data["name"] : "",
      currentJobId: typeof data["currentJobId"] === "string" ? data["currentJobId"] : null,
      checkIns: Number(data["checkIns"] ?? 0),
      bank: Number(data["bank"] ?? 0),
    };
  });
  const readJobs = async (): Promise<CompanionJob[]> => (await firestore.getDocs(jobsRef)).docs.map((record) => {
    const data = record.data();
    return {
      id: record.id,
      title: typeof data["title"] === "string" ? data["title"] : "",
      assigned: Array.isArray(data["assigned"]) ? data["assigned"].filter((id: unknown): id is string => typeof id === "string") : [],
    };
  });

  let students = await readStudents();
  let jobs = await readJobs();
  const metaSnapshot = await firestore.getDoc(metaRef);
  const savedMeta = metaSnapshot.exists() ? metaSnapshot.data() : undefined;
  let meta: CompanionMeta = {
    weekStart: typeof savedMeta?.["weekStart"] === "string" ? savedMeta["weekStart"] : fallback.weekStart,
    history: Array.isArray(savedMeta?.["history"]) ? savedMeta["history"] as HeroJobsState["history"] : fallback.history,
    names: Array.isArray(savedMeta?.["names"])
      ? savedMeta["names"].filter((name: unknown): name is string => typeof name === "string")
      : names,
  };
  meta.names = [...new Set([...meta.names, ...names])];

  // First connection migrates the current Hero Board week. After that, Companion is authoritative.
  const initial = metaSnapshot.exists() || hasCompanionActivity(students, jobs)
    ? companionToHero(students, jobs, { ...fallback, ...meta })
    : normalizeHeroJobs({ ...fallback, ...meta });

  const writeState = async (state: HeroJobsState) => {
    const batch = firestore.writeBatch(db);
    const studentByName = new Map(students.filter((student) => student.name).map((student) => [student.name, student]));
    const allNames = [...new Set([...meta.names, ...Object.values(state.assign), ...students.map((student) => student.name).filter(Boolean)])];
    const nextStudents: CompanionStudent[] = [];

    for (const name of allNames) {
      const existing = studentByName.get(name);
      const id = existing?.id ?? companionStudentId(name);
      const currentJobId = HERO_JOBS.find((job) => state.assign[job.id] === name)?.id ?? null;
      const checkIns = state.checkIns[name] ?? existing?.checkIns ?? 0;
      const ref = firestore.doc(studentsRef, id);
      batch.set(ref, {
        name,
        currentJobId,
        checkIns,
        ...(existing ? {} : { bank: 0, history: [], lastCheckIn: 0 }),
      }, { merge: true });
      nextStudents.push({ id, name, currentJobId, checkIns, bank: existing?.bank ?? 0 });
    }

    const nextJobs: CompanionJob[] = HERO_JOBS.map((job) => {
      const name = state.assign[job.id];
      const student = name ? nextStudents.find((candidate) => candidate.name === name) : undefined;
      const assigned = student ? [student.id] : [];
      batch.set(firestore.doc(jobsRef, job.id), {
        title: job.title,
        capacity: 1,
        gp: job.gp,
        assigned,
      }, { merge: true });
      return { id: job.id, title: job.title, assigned };
    });
    batch.set(metaRef, { weekStart: state.weekStart, history: state.history, names: meta.names });
    await batch.commit();
    students = nextStudents;
    jobs = nextJobs;
    meta = { ...meta, weekStart: state.weekStart, history: state.history };
  };

  await writeState(initial);
  onChange(initial);

  const emit = () => onChange(companionToHero(students, jobs, { ...initial, ...meta }));
  const reportError = () => onError("Classroom Companion could not sync. Check your connection and reopen jobs.");
  const unsubStudents = firestore.onSnapshot(studentsRef, (snapshot) => {
    students = snapshot.docs.map((record) => {
      const data = record.data();
      return {
        id: record.id,
        name: typeof data["name"] === "string" ? data["name"] : "",
        currentJobId: typeof data["currentJobId"] === "string" ? data["currentJobId"] : null,
        checkIns: Number(data["checkIns"] ?? 0),
        bank: Number(data["bank"] ?? 0),
      };
    });
    emit();
  }, reportError);
  const unsubJobs = firestore.onSnapshot(jobsRef, (snapshot) => {
    jobs = snapshot.docs.map((record) => {
      const data = record.data();
      return {
        id: record.id,
        title: typeof data["title"] === "string" ? data["title"] : "",
        assigned: Array.isArray(data["assigned"]) ? data["assigned"].filter((id: unknown): id is string => typeof id === "string") : [],
      };
    });
    emit();
  }, reportError);
  const unsubMeta = firestore.onSnapshot(metaRef, (snapshot) => {
    const data = snapshot.data();
    if (!data) return;
    meta = {
      weekStart: typeof data["weekStart"] === "string" ? data["weekStart"] : meta.weekStart,
      history: Array.isArray(data["history"]) ? data["history"] as HeroJobsState["history"] : meta.history,
      names: Array.isArray(data["names"]) ? data["names"].filter((name: unknown): name is string => typeof name === "string") : meta.names,
    };
    emit();
  }, reportError);

  return {
    save: async (before, after) => {
      const remote = companionToHero(students, jobs, { ...initial, ...meta });
      const merged = mergeHeroAgency(remote, before, after);
      await writeState(merged);
      return merged;
    },
    close: () => { unsubStudents(); unsubJobs(); unsubMeta(); },
  };
}
