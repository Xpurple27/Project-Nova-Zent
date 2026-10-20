
import test from "node:test";
import assert from "node:assert/strict";
import {canTransition,transition} from "../src/game/core/fsm";
import {clampHp,clampResource,composeModifiers,gradeAnswer,performanceMultiplier,resistanceModifier,roundHalfUp,weightedIndex} from "../src/game/core/math";
import {normalizeRoomCode,validRoomCode,parseRoom} from "../src/game/multiplayer/client";
test("valid FSM paths and terminal state guards",()=>{
 assert.equal(canTransition("LOBBY","CHARACTER_SELECT"),true);
 assert.equal(canTransition("READY","STORY"),true);
 assert.equal(canTransition("MATH_CHALLENGE","LOCK_ACTION","ACTION"),true);
 assert.equal(canTransition("MATH_CHALLENGE","TURN_END","ACTION"),false);
 assert.equal(canTransition("MATH_CHALLENGE","TURN_END","TEAM_RUNE"),true);
 assert.throws(()=>transition("COMPLETED","COMBAT_PLANNING"),/INVALID_TRANSITION/);
 assert.equal(canTransition("LOBBY","VICTORY"),false);
});
test("clamps, half-up rounding, nonfinite input and modifiers",()=>{
 assert.equal(clampHp(-5,650),0);assert.equal(clampHp(999,650),650);
 assert.equal(clampResource(120),100);assert.equal(clampResource(-2),0);
 assert.equal(roundHalfUp(4.5),5);assert.throws(()=>roundHalfUp(NaN));
 assert.equal(performanceMultiplier("PERFECT"),1.25);assert.equal(performanceMultiplier("FAILED"),.4);
 assert.equal(resistanceModifier(.2),.8);
 assert.equal(roundHalfUp(composeModifiers(110,.7,.5,.8,.7,.2)),4);
});
test("perfect and deadline boundaries",()=>{
 assert.equal(gradeAnswer(true,6000,12000),"PERFECT");
 assert.equal(gradeAnswer(true,6001,12000),"SUCCESS");
 assert.equal(gradeAnswer(true,12000,12000),"FAILED");
 assert.equal(gradeAnswer(false,1,12000),"FAILED");
 assert.equal(gradeAnswer(true,7500,15000),"PERFECT");
});
test("room code and invalid projection validation",()=>{
 assert.equal(normalizeRoomCode(" abcd234 "),"ABCD234");assert.equal(validRoomCode("ABCD234"),true);
 assert.equal(validRoomCode("OOOOOOO"),false);assert.equal(validRoomCode("ABC123"),false);
 assert.throws(()=>parseRoom({}),/INVALID_ROOM_RESPONSE/);
 assert.equal(weightedIndex([45,25,17,13],0),0);assert.equal(weightedIndex([45,25,17,13],.999),3);
});

test("safe integer boundary and invalid time/random inputs",()=>{
 assert.equal(roundHalfUp(Number.MAX_SAFE_INTEGER),Number.MAX_SAFE_INTEGER);
 assert.throws(()=>roundHalfUp(Number.MAX_SAFE_INTEGER+1),/UNSAFE_EFFECT/);
 assert.throws(()=>gradeAnswer(true,1,Infinity),/NON_FINITE/);
 assert.throws(()=>weightedIndex([1,2],NaN),/INVALID_WEIGHTS/);
});
