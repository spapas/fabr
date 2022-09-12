
const Edge = fabric.util.createClass(fabric.Line, {
  type: 'edge',

  initialize: function(points, options){
    options = options || {};
    this.points = points || [];
    this.lockScalingFlip = true
    this.lockScalingX = true
    this.lockScalingY = true
    this.callSuper('initialize',points, options);
    this.set('basicUnit',  false)
    this.set('label', options.label || '');
  },

  toObject: function() {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      label: this.get('label'),
      basicUnit: this.get('basicUnit')
    });
  },

  _render: function(ctx) {
    this.callSuper('_render', ctx);
    if(this.basicUnit == true) {
      ctx.font = '16px Helvetica';
      ctx.fillStyle = '#319';
      ctx.fillText(this.label,  -this.width/2, -this.height/2 + 20);
    } else {
      ctx.font = '11px Helvetica';
      ctx.fillStyle = '#177';
      ctx.fillText(this.label,  -this.width/2, -this.height/2 + 20);
    }

  }
});


function getLen(line) {
  return Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1,2))
}

function fixRound(f) {
  return Math.round(f * 100) / 100
}

function init() {
  initCanvas()
  initControls()
}

var $ = function(id) { return document.getElementById(id) };

const g_state = {line: null, isDown: false, drawing: false, canvas: null};

function initCanvas() {
  console.log("INIT")

  g_state.canvas = new fabric.Canvas("c", {
    isDrawingMode: false,
    //freeDrawingBrush: new fabric.PencilBrush({ decimate: 8 })
  });
  const canvas = g_state.canvas
  canvas.setHeight(window.innerHeight);
  canvas.setWidth(window.innerWidth - window.innerWidth *0.1);

  canvas.on('mouse:wheel', function(opt) {
    var delta = opt.e.deltaY;
    var zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.01) zoom = 0.01;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });

  canvas.on('mouse:down', function(opt) {
    var evt = opt.e;
    if (evt.altKey === true) {
      this.isDragging = true;
      this.selection = false;
      this.lastPosX = evt.clientX;
      this.lastPosY = evt.clientY;
    }
  });

  canvas.on('mouse:move', function(opt) {
    if (this.isDragging) {
      var e = opt.e;
      var vpt = this.viewportTransform;
      vpt[4] += e.clientX - this.lastPosX;
      vpt[5] += e.clientY - this.lastPosY;
      this.requestRenderAll();
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    }
  });

  canvas.on('mouse:up', function(opt) {
    // on mouse up we want to recalculate new interaction
    // for all objects, so we call setViewportTransform
    this.setViewportTransform(this.viewportTransform);
    this.isDragging = false;
    this.selection = true;
  });
    
  canvas.on('mouse:down', function(o){
    if (!g_state.drawing) return;
    g_state.isDown = true;
    var pointer = canvas.getPointer(o.e);
    var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];

    g_state.line = new Edge(points, {
      strokeWidth: 2,
      fill: 'black',
      stroke: 'black',
      originX: 'center',
      originY: 'center'
    });
  
    canvas.add(g_state.line);
  });

  canvas.on('mouse:move', function(o){
    if (!g_state.drawing) return;
    if (!g_state.isDown) return;
    const line = g_state.line
    
    var pointer = canvas.getPointer(o.e);
    if(o.e.shiftKey) {
      if( Math.abs(line.y1 - pointer.y) > Math.abs(line.x1 - pointer.x)) {
        line.set({ y2: pointer.y, x2: line.x1 });
      } else {
        line.set({ x2: pointer.x, y2: line.y1 });
      }
      
    } else {
      line.set({ x2: pointer.x, y2: pointer.y });
    }
    var len = getLen(line);
    line.label = fixRound(len);
    canvas.renderAll();
  });

  canvas.on('mouse:up', function(o){
    g_state.isDown = false;
  });

}

function initControls() {

  var drawingModeEl = $('drawing-mode');
  var removeEl = $('remove');
  var setBasicUnitEl = $('set-basic-unit');
  var imgLoader = $('imgLoader');

  removeEl.onclick = function() {
      g_state.canvas.getActiveObjects().forEach((obj) => {
        g_state.canvas.remove(obj);
    })
  }

  setBasicUnitEl.onclick = function() {
    const canvas = g_state.canvas
    var ao = canvas.getActiveObject()
    if (!ao || ao.type != 'edge') return ;
    var aolen = getLen(ao);

    canvas.getObjects().forEach((obj) => {
      
      obj.basicUnit = false 
      obj.dirty = true
      obj.label = fixRound(getLen(obj) / aolen);
    });
    ao.basicUnit = true;
    ao.label = 1
    canvas.renderAll()
  }

  drawingModeEl.onclick = function() {
    g_state.drawing = !g_state.drawing;
    if(g_state.drawing) {
      g_state.canvas.selection = false;
      drawingModeEl.innerHTML = 'Select mode';
    } else {
      g_state.canvas.selection = true;
      drawingModeEl.innerHTML = 'Drawing mode';
    }
  }

  imgLoader.onchange = function handleImage(e) {
      var reader = new FileReader();
      reader.onload = function (event) {
        var imgObj = new Image();
        imgObj.src = event.target.result;
        imgObj.onload = function () {
          const canvas = g_state.canvas;
          var image = new fabric.Image(imgObj);
          canvas.setZoom(1);
          canvas.viewportTransform = [1, 0, 0, 1, 0, 0];

          var canvasAspect = canvas.width / canvas.height;
          var imgAspect = image.width / image.height;
          var left, top, scaleFactor;

          if(image.width < image.height) {
            if (canvasAspect >= imgAspect) {
              var scaleFactor = canvas.height / image.height;
                top = 0;
                left = -((image.width * scaleFactor) - canvas.width) / 2;
                
            } else {
              var scaleFactor = canvas.width / image.width;
                left = 0;
                top = -((image.height * scaleFactor) - canvas.height) / 2;
            }
          } else {
            if (canvasAspect <= imgAspect) {
                var scaleFactor = canvas.width / image.width;
                left = 0;
                top = -((image.height * scaleFactor) - canvas.height) / 2;
            } else {
                var scaleFactor = canvas.height / image.height;
                top = 0;
                left = -((image.width * scaleFactor) - canvas.width) / 2;

            }
          }

          
          canvas.setBackgroundImage(image, canvas.renderAll.bind(canvas), {

            top: top,
            left: left,
            originX: 'left',
            originY: 'top',
            scaleX: scaleFactor,
            scaleY: scaleFactor

          });
        }
      }
      reader.readAsDataURL(e.target.files[0]);
    }
}
init();
