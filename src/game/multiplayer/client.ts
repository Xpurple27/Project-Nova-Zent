import { browserSupabase } from "../../lib/supabase/browser";
import { CLASSES, GAME_STATES, SCHOOL_LEVELS, type RoomState, type SchoolLevel } from "../core/types";
export type LobbyCommand = "CREATE"|"JOIN"|"GET"|"HEARTBEAT"|"SELECT_CLASS"|"SET_READY"|"START"|"LEAVE"|"REMOVE_INACTIVE";
export const normalizeRoomCode=(s:string)=>s.trim().toUpperCase();
export const validRoomCode=(s:string)=>/^[A-HJ-NP-Z2-9]{7}$/.test(normalizeRoomCode(s));
export function parseRoom(value:unknown):RoomState {
 if(!value||typeof value!=="object")throw new Error("INVALID_ROOM_RESPONSE");
 const raw=value as RoomState;
 const r={...raw,schoolLevel:raw.schoolLevel??"SMA"} as RoomState&{schoolLevel:SchoolLevel};
 if(typeof r.id!=="string"||typeof r.sessionId!=="string"||!/^\d+$/.test(r.version)||!GAME_STATES.includes(r.state)||!SCHOOL_LEVELS.includes(r.schoolLevel)||!Array.isArray(r.players)||r.players.length>4)throw new Error("INVALID_ROOM_RESPONSE");
 for(const p of r.players)if(typeof p.id!=="string"||typeof p.userId!=="string"||typeof p.nickname!=="string"||(p.classId!==null&&!CLASSES.includes(p.classId)))throw new Error("INVALID_ROOM_RESPONSE");
 return r;
}
export async function lobbyCommand(command:LobbyCommand,payload:Record<string,unknown>,requestId=crypto.randomUUID()):Promise<RoomState>{
 const args={p_command:command,p_payload:payload,p_request_id:requestId};let response=await browserSupabase().rpc("nz_lobby_v1",args);if(response.error&&(response.status===0||response.status>=500))response=await browserSupabase().rpc("nz_lobby_v1",args);if(response.error)throw new Error(response.error.message);return parseRoom(response.data);
}
export async function setSchoolLevel(roomId:string,schoolLevel:SchoolLevel):Promise<RoomState>{const response=await browserSupabase().rpc("nz_school_level_v1",{p_room:roomId,p_level:schoolLevel});if(response.error)throw new Error(response.error.message);return parseRoom(response.data);}
export function lobbyError(error:unknown):string{
 const message=error instanceof Error?error.message:String(error);const known:Record<string,string>={CAPTCHA_REQUIRED:"Selesaikan verifikasi hCaptcha sebelum masuk sebagai guest.",SUPABASE_NOT_CONFIGURED:"Isi environment Supabase sesuai .env.example.",ROOM_NOT_FOUND:"Kode room tidak ditemukan.",ROOM_FULL:"Room sudah berisi empat pemain.",ROOM_EXPIRED:"Room sudah kedaluwarsa.",CLASS_TAKEN:"Class itu baru saja dipilih pemain lain.",CLASS_OR_SEAT_TAKEN:"Slot atau class sudah terpakai. State room diperbarui.",CLASS_REQUIRED:"Pilih class sebelum Ready.",NOT_COORDINATOR:"Hanya coordinator yang dapat mengubah pengaturan atau memulai.",NOT_READY:"Semua anggota harus aktif, memilih class, dan Ready.",RUN_ALREADY_STARTED:"Room sudah dimulai. Pengaturan tidak dapat diubah.",INVALID_SCHOOL_LEVEL:"Pilih tingkatan sekolah SD, SMP, atau SMA.",NOT_A_MEMBER:"Identitas ini bukan anggota room.",RATE_LIMITED:"Terlalu banyak permintaan. Tunggu sebentar."};
 if((typeof error==="object"&&error!==null&&"code" in error&&error.code==="captcha_failed")||/^captcha (?:verification|validation) failed/i.test(message))return "Verifikasi hCaptcha ditolak atau kedaluwarsa. Silakan verifikasi ulang.";if(/anonymous.*disabled/i.test(message))return "Anonymous Sign-Ins belum aktif di Supabase. Aktifkan pada Authentication → Sign In / Providers → Anonymous.";return known[message]??message;
}
