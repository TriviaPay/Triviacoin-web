export type Option = {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  category: string;
  prompt: string;
  options: Option[];
};

export type LeaderboardEntry = {
  name: string;
  score: number;
  streak: number;
};

export const DEFAULT_TIMER = 15;

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'Geography',
    prompt: 'What is the capital of Australia?',
    options: [
      { id: 'A', label: 'A', text: 'Sydney', isCorrect: false },
      { id: 'B', label: 'B', text: 'Melbourne', isCorrect: false },
      { id: 'C', label: 'C', text: 'Canberra', isCorrect: true },
      { id: 'D', label: 'D', text: 'Perth', isCorrect: false },
    ],
  },
  {
    id: 'q2',
    category: 'Science',
    prompt: 'Which planet is the largest in our solar system?',
    options: [
      { id: 'A', label: 'A', text: 'Earth', isCorrect: false },
      { id: 'B', label: 'B', text: 'Mars', isCorrect: false },
      { id: 'C', label: 'C', text: 'Jupiter', isCorrect: true },
      { id: 'D', label: 'D', text: 'Saturn', isCorrect: false },
    ],
  },
  {
    id: 'q3',
    category: 'History',
    prompt: 'In which year did the Apollo 11 land on the Moon?',
    options: [
      { id: 'A', label: 'A', text: '1965', isCorrect: false },
      { id: 'B', label: 'B', text: '1969', isCorrect: true },
      { id: 'C', label: 'C', text: '1972', isCorrect: false },
      { id: 'D', label: 'D', text: '1975', isCorrect: false },
    ],
  },
  {
    id: 'q4',
    category: 'Art',
    prompt: 'Who painted the Mona Lisa?',
    options: [
      { id: 'A', label: 'A', text: 'Leonardo da Vinci', isCorrect: true },
      { id: 'B', label: 'B', text: 'Michelangelo', isCorrect: false },
      { id: 'C', label: 'C', text: 'Raphael', isCorrect: false },
      { id: 'D', label: 'D', text: 'Vincent van Gogh', isCorrect: false },
    ],
  },
  {
    id: 'q5',
    category: 'Nature',
    prompt: 'What is the fastest land animal?',
    options: [
      { id: 'A', label: 'A', text: 'Lion', isCorrect: false },
      { id: 'B', label: 'B', text: 'Cheetah', isCorrect: true },
      { id: 'C', label: 'C', text: 'Pronghorn', isCorrect: false },
      { id: 'D', label: 'D', text: 'Horse', isCorrect: false },
    ],
  },
  {
    id: 'q6',
    category: 'Chemistry',
    prompt: 'What is the chemical symbol for Gold?',
    options: [
      { id: 'A', label: 'A', text: 'Ag', isCorrect: false },
      { id: 'B', label: 'B', text: 'Au', isCorrect: true },
      { id: 'C', label: 'C', text: 'Pt', isCorrect: false },
      { id: 'D', label: 'D', text: 'Pb', isCorrect: false },
    ],
  },
  {
    id: 'q7',
    category: 'Literature',
    prompt: 'Who wrote "1984"?',
    options: [
      { id: 'A', label: 'A', text: 'George Orwell', isCorrect: true },
      { id: 'B', label: 'B', text: 'Aldous Huxley', isCorrect: false },
      { id: 'C', label: 'C', text: 'Ray Bradbury', isCorrect: false },
      { id: 'D', label: 'D', text: 'Jules Verne', isCorrect: false },
    ],
  },
  {
    id: 'q8',
    category: 'Math',
    prompt: 'What is the smallest prime number?',
    options: [
      { id: 'A', label: 'A', text: '0', isCorrect: false },
      { id: 'B', label: 'B', text: '1', isCorrect: false },
      { id: 'C', label: 'C', text: '2', isCorrect: true },
      { id: 'D', label: 'D', text: '3', isCorrect: false },
    ],
  },
  {
    id: 'q9',
    category: 'Geography',
    prompt: 'The River Nile flows into which sea?',
    options: [
      { id: 'A', label: 'A', text: 'Red Sea', isCorrect: false },
      { id: 'B', label: 'B', text: 'Mediterranean Sea', isCorrect: true },
      { id: 'C', label: 'C', text: 'Arabian Sea', isCorrect: false },
      { id: 'D', label: 'D', text: 'Black Sea', isCorrect: false },
    ],
  },
  {
    id: 'q10',
    category: 'Biology',
    prompt: 'Plants primarily take in which gas from the air?',
    options: [
      { id: 'A', label: 'A', text: 'Oxygen', isCorrect: false },
      { id: 'B', label: 'B', text: 'Carbon Dioxide', isCorrect: true },
      { id: 'C', label: 'C', text: 'Nitrogen', isCorrect: false },
      { id: 'D', label: 'D', text: 'Helium', isCorrect: false },
    ],
  },
];

const LEADERBOARD: LeaderboardEntry[] = [
  { name: 'Amelia', score: 980, streak: 7 },
  { name: 'Liam', score: 930, streak: 5 },
  { name: 'Noah', score: 910, streak: 4 },
  { name: 'Olivia', score: 870, streak: 3 },
  { name: 'Mason', score: 820, streak: 2 },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchQuestions = async (): Promise<Question[]> => {
  await delay(380);
  return shuffle([...SAMPLE_QUESTIONS]);
};

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  await delay(260);
  return LEADERBOARD;
};

export const shuffle = <T,>(items: T[]): T[] => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

export const formatSeconds = (value: number): string => {
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const computeBonus = (score: number, correctCount: number): number => {
  const streakBonus = correctCount >= 8 ? 120 : correctCount >= 5 ? 80 : 40;
  return Math.round(score * 0.05) + streakBonus;
};
