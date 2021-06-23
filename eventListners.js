 function setEventListners() {
    //Set the listener to the move button
    var move = document.getElementById("confirm_Move");
    move.addEventListener("click", (e) => {
        var moveFrom = document.getElementById("drop-down-from");
        var moveTo = document.getElementById("drop-down-to");
        displayAlert(false,"","");
        game.initMove(moveFrom.value,moveTo.value);
    }, false);

    //Set the listener to the play btn
    var playBtn = document.getElementById("play_btn");
    playBtn.addEventListener("click", (e) => {
        var numOfDiscs = parseInt(document.getElementById("drop-down-difficulty").value);
        //Reset init matrix
        nodes.forEach(node => {
            node.worldMatrix = node.initMatrix.slice();
        });
        game = new Game(nodes.slice(2, numOfDiscs + 2));
        game.scaleMesurements(scaling);

        spotLightColor = [0.0, 0.0, 0.0];
        ableMoveElements();

    }, false);
    
    //hideSameLocation();
    setCameraListeners();

    var moveFrom = document.getElementById("drop-down-from");
    moveFrom.addEventListener("change", onFromChange, false);

    var textureSelected = document.getElementById("drop-down-texture");
    textureSelected.addEventListener("change", (e) => {
         loadTexture(textureSelected.value);
    });

};

function displayAlert(display,type,text) {
    var alert = document.getElementById("alert");
    if(display){
        alert.style.display = "block";
        alert.className = "alert alert-"+ type +" fade show mt-4";
        alert.textContent = text;
        //Close after a delta time
        setTimeout(() => {
            alert.style.display = "none";
        }, 2500);
    }
    else
        alert.style.display = "none";
}

function setCameraListeners(){
    var angleSlider = document.getElementById("angleSlider");
    var elevationSlider = document.getElementById("elevationSlider");
    var divElevationSlider = document.getElementById("slider1");
    var divAngleSlider = document.getElementById("slider2");
    var canvas = document.getElementById("gameCanvas");
    
    function changeLookRadius(event) {
        var nLookRadius = lookRadius + event.wheelDelta/1000.0;
        if((nLookRadius > 2.0) && (nLookRadius < 20.0)) {
            lookRadius = nLookRadius;
        }
    }

    function changeAngle(event) {    
        angle = angleSlider.value;
        divAngleSlider.innerText = " Angle:" + angleSlider.value +"°";
    }    
    
    function changeElevation(event) {
        elevation = elevationSlider.value;
        divElevationSlider.innerText = " Elev:" + elevationSlider.value +"°";
    }

    angleSlider.addEventListener("input", changeAngle);
    elevationSlider.addEventListener("input", changeElevation);
    canvas.addEventListener("mousewheel", changeLookRadius, false);
}


function setMouseListeners(){
    //Event handlers to rotate camera on mouse dragging
    var fromRod = null;
    var mouseState = false;
    var lastMouseX = -100, lastMouseY = -100;
    var clickedDisc = null;
    var preMovementWorldMatrix = null;
    var preMovementCenter = null;
    var isTopDisc;
    
    function doMouseDown(event) {
        clickedDisc = myOnMouseDown(event);
        lastMouseX = event.pageX;
        lastMouseY = event.pageY;
        
        if(clickedDisc != null) {
            mouseState = true;
            preMovementWorldMatrix = clickedDisc.node.worldMatrix;
            preMovementCenter = clickedDisc.center;
            game.rods.forEach(rod => {
              rod.discs.forEach(disc => {
                    if(clickedDisc === disc){
                        fromRod = rod;
                        isTopDisc = (fromRod.discs.indexOf(clickedDisc) === fromRod.discs.length - 1);
                    }
                });
            });
        }
    }

    function doMouseUp(event) {
        lastMouseX = -100
        lastMouseY = -100;
        var offset = 0;
        

        if(clickedDisc!=null) {
            var selectedRod = getSelectedRod(clickedDisc.center);
            

            if(selectedRod != null  && game.isMoveAllowed(game.rods.indexOf(fromRod)+1,game.rods.indexOf(selectedRod)+1)){
                offset = 0.7;
                if(selectedRod.discs.indexOf(game.discs[0])==0){ //if on the pile there is the largest disc
                    offset = game.discs[0].height;
                }
                var finalPoisition = utils.multiplyMatrices(utils.MakeTranslateMatrix(selectedRod.center[0] - preMovementCenter[0],selectedRod.getDiscStackHeight() + offset - preMovementCenter[1], 0.0),preMovementWorldMatrix);
                clickedDisc.node.updateWorldMatrix(finalPoisition);
                clickedDisc.center = [selectedRod.center[0],selectedRod.getDiscStackHeight() + offset, 0.0];
                game.initMove(game.rods.indexOf(fromRod)+1,game.rods.indexOf(selectedRod)+1,false);
                game.checkWin();
            }else{
                //IF WRONG RELEASE POSITION
                clickedDisc.node.updateWorldMatrix(preMovementWorldMatrix);
                clickedDisc.center = preMovementCenter;
                if(selectedRod != fromRod){
                    if(!isTopDisc){
                        displayAlert(true,"danger","Remeber that you can move only the top disc of each rod");
                    }else{
                        displayAlert(true,"danger","Remeber that you can move discs only on bigger ones");
                    }
                }
                
            }
            //Reset
            clickedDisc = null;
            preMovementCenter = null;
            preMovementWorldMatrix = null;
            mouseState = false;
        }
    }

    function getSelectedRod(center){
        for(let i=0; i<3;i++){ 
            if(center[0] < game.rods[i].center[0] + game.rods[i].width && center[0] >  game.rods[i].center[0] - game.rods[i].width 
                && center[1] < game.rods[i].center[1] + game.rods[i].height && center[1] >  game.rods[i].center[1] - game.rods[i].height 
                && center[2] < game.rods[i].center[2] + game.rods[i].width && center[2] >  game.rods[i].center[2] - game.rods[i].width)

                return game.rods[i];
        }
        return null;
    }

    function doMouseMove(event) {
        if(mouseState) {
            var dx = event.pageX - lastMouseX;
            var dy = lastMouseY - event.pageY;
            lastMouseX = event.pageX;
            lastMouseY = event.pageY;
            
            var delta = lookRadius / deltaFactor;

            if(isTopDisc && ((dx != 0) || (dy != 0)) ) {
                var oldWorldMatrix = clickedDisc.node.worldMatrix;
                var translationMatrix = utils.MakeTranslateMatrix(dx * delta, dy * delta, 0.0);
                var newWorldMatrix = utils.multiplyMatrices(translationMatrix, oldWorldMatrix);
                clickedDisc.node.updateWorldMatrix(newWorldMatrix);
                clickedDisc.center = [clickedDisc.center[0] + dx * delta, clickedDisc.center[1] + dy * delta, clickedDisc.center[2] + 0.0];
            }
        }
    }

    //Set mouse event handlers
    window.addEventListener("mousedown", doMouseDown, false);
	window.addEventListener("mouseup", doMouseUp, false);
	window.addEventListener("mousemove", doMouseMove, false);
}

function hideSameLocation(){
    var moveFrom = document.getElementById("drop-down-from");
    var moveTo = document.getElementById("drop-down-to");

    //set all the unfeasible options of the moveTo to invisible
    for (let  j = 0; j < moveTo.options.length ; j++) {
        if (moveTo.options[j].value === moveFrom.value) {
            moveTo.options[j].style.display = "none";
            break;
        }
    }

    //set all the unfeasible options of the moveFrom to invisible
    for (let  j = 0; j < moveFrom.options.length ; j++) {
        if (moveFrom.options[j].value === moveTo.value) {
            moveFrom.options[j].style.display = "none";
            break;
        }
    }

    moveFrom.addEventListener("change", (e) => {

        //set all the options of the moveTo to visible
        for(let j=0; j < moveFrom.options.length ;j++){
            moveTo.options[j].style.display= "block";
        }
        
        
        //set all the unfeasible options of the moveTo to invisible
        for (let  j = 0; j < moveTo.options.length ; j++) {
            if (moveTo.options[j].value === moveFrom.value) {
                moveTo.options[j].style.display = "none";
                break;
            }
        }
    });

    moveTo.addEventListener("change", (e) => {
                
        //set all the options of the moveFrom to visible
        for(let j=0; j < moveTo.options.length ;j++){
            moveFrom.options[j].style.display= "block";
        }
        
        //set all the unfeasible options of the moveFrom to invisible
        for (let  j = 0; j < moveFrom.options.length ; j++) {
            if (moveFrom.options[j].value === moveTo.value) {
                moveFrom.options[j].style.display = "none";
                break;
            }
        }
    });

}

function unableMoveElements() {
    var moveFrom = document.getElementById("drop-down-from");
    var moveTo = document.getElementById("drop-down-to");
    var move = document.getElementById("confirm_Move");

    moveFrom.disabled = true;
    moveTo.disabled = true;
    move.disabled = true;
}

function ableMoveElements() {
    var moveFrom = document.getElementById("drop-down-from");
    var moveTo = document.getElementById("drop-down-to");
    var move = document.getElementById("confirm_Move");

    moveFrom.disabled = false;
    moveTo.disabled = false;
    move.disabled = false;
}

function onFromChange() {
    var moveFrom = document.getElementById("drop-down-from");
    var moveTo = document.getElementById("drop-down-to");

    var selectedValue = moveFrom.value;
    
    for (let  j = 0, firstVisibile = true; j < moveFrom.options.length ; j++) {
        if(moveTo.options[j].value === selectedValue) {
            moveTo.options[j].style.display = "none";
        }else{
            moveTo.options[j].style.display = "block";
            if(firstVisibile) {
                firstVisibile = false;
                moveTo.selectedIndex = j;
            };
        }
    }

}