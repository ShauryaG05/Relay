import { useEffect, useState } from "react";
import { motion } from 'motion/react';



function Dash() {
    // useEffect(()=>{
    //     userInfo();
    // },[])

    // async function userInfo(){

    // }

    async function lock_device() {

    }
    return (
        <>
            <motion.div animate={{ scale: 3 }} transition={{ duration: 3 }} className="main bg-amber-50">
                <button onClick={lock_device}>Lock device</button>
            </motion.div>
            <motion.div animate={{ scale: 3 }} transition={{ duration: 3 }} className="main bg-amber-50">
                <button onClick={lock_device}>Shutdown device</button>
            </motion.div>
            <motion.div animate={{ scale: 3 }} transition={{ duration: 3 }} className="main bg-amber-50">
                <button onClick={lock_device}>Restart device</button>
            </motion.div>
        </>

    )
}

export default Dash;