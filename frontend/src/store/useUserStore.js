import { create} from 'zustand'
import {persist} from 'zustand/middleware'


const useUserStore = create(
    persist(
        (set)=>({
            user:null,
            isAuthenticate:false,
            setUser: (userData) => set({user:userData,isAuthenticate:true}),
            clearUser : ()=>set({user:null,isAuthenticate:false}),
        }),
        {
            name : 'user-storage',
            getStorage : ()=>localStorage
        }
    )
);
export default useUserStore;