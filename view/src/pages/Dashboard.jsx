function dashboard(){
    async function lock_device(){
        console.log("Heyy ")
        
    }
    return (
        <div className="main">
            <div className="action_buttons">
                <button onClick={lock_device} className="bg-black-500">Lock the Device</button>
            </div>
        </div>  
    )
}

export default dashboard