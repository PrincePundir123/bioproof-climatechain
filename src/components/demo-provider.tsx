'use client';
import {createContext,useContext,useState,type Dispatch,type SetStateAction} from 'react';
import type {Actor,Batch} from '@/lib/domain';
type DemoState={batches:Batch[];setBatches:Dispatch<SetStateAction<Batch[]>>;actor:Actor;setActor:Dispatch<SetStateAction<Actor>>};
const Context=createContext<DemoState|null>(null);
export function DemoProvider({initial,children}:{initial:Batch[];children:React.ReactNode}){const [batches,setBatches]=useState(initial),[actor,setActor]=useState<Actor>({id:'demo-auditor',role:'AUDITOR'});return <Context.Provider value={{batches,setBatches,actor,setActor}}>{children}</Context.Provider>}
export const useDemo=()=>useContext(Context);
