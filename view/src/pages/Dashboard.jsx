function dash(){

    return(
        <>
            <div className="main">
                <div className="quick flex flex-wrap gap-3">
                    <button className="bg-red-600">Shutdown</button>
                    <button className="bg-yellow-600 px-4 rounded" >Restart</button>
                    <button className="bg-pink-600 px-4">Lock Device</button>
                    <button className="bg-blue-600">sleep</button>
                </div>
            </div>
        </>
    )

}

export default dash;