
/** Non-secret QA fixtures. Never import into an online challenge assignment service. */
import type { DevelopmentQuestion, QuestionDifficulty } from "../core/types";
export const DEVELOPMENT_QUESTIONS:DevelopmentQuestion[]=[
 {id:"e1",difficulty:"EASY",category:"ARITHMETIC",prompt:"12 + 18 = ?",options:["26","30","32","36"],answerIndex:1,explanation:"12 + 18 = 30."},
 {id:"e2",difficulty:"EASY",category:"PERCENTAGE",prompt:"15% dari 200 adalah ...",options:["15","20","30","35"],answerIndex:2,explanation:"0,15 × 200 = 30."},
 {id:"e3",difficulty:"EASY",category:"ARITHMETIC",prompt:"3 × 7 + 5 = ?",options:["26","36","24","21"],answerIndex:0,explanation:"Kerjakan perkalian dahulu: 21 + 5 = 26."},
 {id:"e4",difficulty:"EASY",category:"RATIO",prompt:"Rasio kristal merah : biru = 2 : 3. Total 25 kristal. Berapa kristal merah?",options:["5","15","12","10"],answerIndex:3,explanation:"2/5 × 25 = 10."},
 {id:"m1",difficulty:"MEDIUM",category:"ALGEBRA",prompt:"Jika 3x + 7 = 28, berapakah x?",options:["5","6","7","9"],answerIndex:2,explanation:"3x = 21, jadi x = 7."},
 {id:"m2",difficulty:"MEDIUM",category:"PATTERN",prompt:"Lanjutkan pola kuadrat: 4, 9, 16, 25, ...",options:["30","36","35","49"],answerIndex:1,explanation:"2², 3², 4², 5², lalu 6² = 36."},
 {id:"m3",difficulty:"MEDIUM",category:"PERCENTAGE",prompt:"120 HP berkurang 25%. Berapa HP tersisa?",options:["95","100","80","90"],answerIndex:3,explanation:"120 × 0,75 = 90."},
 {id:"m4",difficulty:"MEDIUM",category:"PROBABILITY",prompt:"Kantong berisi 3 rune merah dan 5 biru. Peluang mengambil rune merah?",options:["3/8","3/5","5/8","1/3"],answerIndex:0,explanation:"Ada 3 hasil merah dari 8 kemungkinan."},
 {id:"h1",difficulty:"HARD",category:"ALGEBRA",prompt:"f(x) = 2x² − 3x + 1. Berapa f(4)?",options:["17","21","25","29"],answerIndex:1,explanation:"2(16) − 12 + 1 = 21."},
 {id:"h2",difficulty:"HARD",category:"ALGEBRA",prompt:"2x + y = 13 dan x − y = 2. Berapa nilai x?",options:["3","4","5","6"],answerIndex:2,explanation:"Jumlahkan persamaan: 3x = 15."},
 {id:"h3",difficulty:"HARD",category:"PATTERN",prompt:"Pola n(n+1): 2, 6, 12, 20, 30, ...",options:["36","40","48","42"],answerIndex:3,explanation:"Suku selanjutnya 6 × 7 = 42."},
 {id:"h4",difficulty:"HARD",category:"RATIO",prompt:"Dua rune bernilai 60 dan tiga rune bernilai 90. Berapa rata-rata kelima rune?",options:["78","75","80","84"],answerIndex:0,explanation:"(2 × 60 + 3 × 90) / 5 = 78."}
];
export function developmentQuestion(difficulty:QuestionDifficulty,turn:number,seat:number):DevelopmentQuestion {
 const pool=DEVELOPMENT_QUESTIONS.filter(q=>q.difficulty===difficulty);return pool[(turn+seat-1)%pool.length];
}
