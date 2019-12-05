// JavaScript Document
const max_number_of_classes = 10;
var selected_number_of_classes = 2;
var class_details = Array();
var number_of_times_trained = 0;
var prediction_sampling_rate = 0;
var microbit_paired = false;

var colorArray = ['#FF6633', '#20a7ae', '#FF33FF', '#FFFF99', '#00B3E6', 
		  '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
		  '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', 
		  '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
		  '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', 
		  '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
		  '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', 
		  '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
		  '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', 
'#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF'];
var featureExtractor;

// BroadcastChannel tests - Start

var myChannel = new BroadcastChannel("blob_bus");

var broadcastFrame = {};

//setup broadcast channel
broadcastFrame.setup = function() {
    if ("BroadcastChannel" in window) {
        if (typeof broadcastFrame.channel === 'undefined' || !broadcastFrame.channel) {
            broadcastFrame.channel = new BroadcastChannel("blob_bus");
        }
        //function to process broadcast messages
        function func(e) {
            if (e.data.image instanceof Blob) {
                //if message is a blob create a new image element and add to page
                var blob = e.data.image;
                var newImg = document.createElement("img"),
                    url = URL.createObjectURL(blob);
                newImg.onload = function() {
                    // no longer need to read the blob so it's revoked
                    URL.revokeObjectURL(url);
                };
                newImg.src = url;
                var content = document.getElementById("content");
                content.innerHTML = "";
                content.appendChild(newImg);
            }
        };
        //set broadcast channel message handler
        broadcastFrame.channel.onmessage = func;
    }
}
window.onload = broadcastFrame.setup();

// BroadcastChannel tests - End

function buildNumberOfClassesSelector() {
	console.log("Build class selector");
	var ui = '<div class="container">';
	ui += '<div class="row no-gutters">';
	ui += '<h2 class="mt-5">Please select the number of classes you would like to train in this model</h2>';
	ui += '<label class="mt-4">SELECT # OF CLASSES:</label><select name="select_number_of_classes">';
	ui += '<option value="">select</option>';
	for (var i = 2; i < (max_number_of_classes + 1); i++) {
		ui += '<option value="' + i + '">' + i + '</option>';
	}
	ui += '</select>';
	ui += '</div>';
	ui += '</div>';
	
	var $ui = $(ui);
	$ui.find('select[name=select_number_of_classes]').on("change", function() {
		console.log("number of classes selected");
		selected_number_of_classes = $(this).val();
		configureEachClass();
		
	});

	$("#content").empty().append($ui);
}

function configureEachClass() {
	console.log("time to configure each new class for classification");
	
	var ui = '<div class="container">';
	ui += '<div class="row no-gutters">';
	ui += '<div class="col-8">';
	ui += '<h2 class="mt-5">Please select a name for each of your classes</h2>';
	ui += '<p>note: selecting color does not affect model and is simply there for UI/UX</p>';

	
	ui += '<ul>';
	for (var i = 0; i < selected_number_of_classes; i ++) {
		ui += '<li><div name="class_' + i + '" class="class_config"><div><label>class:</label><input type="text" value="' + (i+1) + '" disabled></div><div><label>name this class:</label><input name="class_name" type="text"></div><div><label> class color:</label><input name="class_color"  type="color" value="' + colorArray[i] + '"></div></div></li>'
	}
	ui += '</ul>';
	ui += '<div class="text-right">';
	ui += '<button name="btn_accept"">ACCEPT</button>';
	ui += '</div>';
	
	ui += '</div>';
	ui += '</div>';
	ui += '</div>';
	
	var $ui = $(ui);
	
	for (var i = 0; i < selected_number_of_classes; i ++) {
		//console.log($ui.find("div[name=class_" + i + "]").find("input[name=class_color]").val());
		$ui.find("div[name=class_" + i + "]").css({
			//'box-shadow' : '0  0 0 10px ' + $("#class_" + i).find("input[name=class_color]").val()
			'box-shadow' : '0 0 0 25px ' +  $ui.find("div[name=class_" + i + "]").find("input[name=class_color]").val()
			//'width' : '1000px'
		}).find('input[name=class_color]').on("change", function() {
			//console.log("Change my color for " + $(this).val());
			$(this).parent().parent().css({
				'box-shadow' : '0 0 0 25px ' +  $(this).val()
			})
		})
	}
	
	
	$ui.find("button[name=btn_accept]").on("click", function() {
		var validated = true;
		
		for (var i = 0; i < selected_number_of_classes; i ++) {
			if ($ui.find("div[name=class_" + i + "]").find("input[name=class_name]").val().length < 1) {
				validated = false;
			}
		}
		
		
		if (validated) {
			for (var i = 0; i < selected_number_of_classes; i ++) {
				console.log($ui.find("div[name=class_" + i + "]").find("input[name=class_color]").val());
				var card_details = {
					'label' : $ui.find("div[name=class_" + i + "]").find("input[name=class_name]").val(),
					'color' : $ui.find("div[name=class_" + i + "]").find("input[name=class_color]").val(),
					'number_of_samples' : 0
				}
				
				class_details.push(card_details);
			}
			//console.log(class_details);
			buildMLForMB();
		} else {
			console.log("You need to name all your categories");
		}
		
		
		
	});
	$("#content").empty().append($ui);
}

function buildMLForMB() {
	console.log("Load MobileNet model");
	var ui = '<div class="container">';
	ui += '<div class="row">';
	ui += '<h2 class="mt-5">One moment, loading MobileNet model...</h2>';
	ui += '</div>';
	ui += '</div>';
	
	var $ui = $(ui)
	$("#content").empty().append($ui);
	featureExtractor = ml5.featureExtractor('MobileNet', mobileNetReady);
}

function mobileNetReady() {
	console.log("MobileNet model ready. Configure feature extractor");
	var webCamFee;
	var webCanvas;
	var ctx;
	var loss;
	var continous_predicting = false;
	
	
	var ui = '<div class="container">';
	ui += '<h2 class="mt-5">Welcome to your new training model.</h2>';
	ui += '<div class="row no-gutters mt-5">';
	
	
	ui += '<div class="col-5">'
	ui += '<canvas id="webCanvas" class="webCanvas" width="420" height="315"></canvas>';
	ui += '<div class="webCamFeed_wrapper">';
	ui += '<video id="webCamFeed" class="webCamFeed" width="420px" height="315px" autoplay></video>';
	ui += '<div><button name="btn_train" class="mr-3">TRAIN MODEL</button><div class="predict_group"><button name="btn_predict" class="mr-3" style="width:120px">PREDICT</button><input class="mr-3" name="input_predict_always_on"type="checkbox"><select name="prediction_frequency"><option value="0">0</option><option value="50">50</optioon><option value="100">100</optioon><option value="150">150</optioon><option value="200">200</optioon><option value="250">250</optioon><option value="400">400</optioon><option value="500">500</optioon><option value="750">750</optioon><option value="1000">1000</optioon></select></div></div>';
	ui += '<h4 class="mt-4">system messges:</h4>';
	ui += '<div id="system_messages" class="system_messages"></div>';
	ui += '</div>';
	ui += '</div>';
	
	ui += '<div class="col-4">'
	ui += '<ul>';
	for (var i = 0; i < class_details.length;  i++) {
		ui += '<li id="card_' + i + '"><div class="d-flex align-items-center"><div><button class="mr-4">ADD IMAGE</button><p class="text-center mr-4">' + class_details[i]['number_of_samples'] + '</p></div><div class="cat_card"><img width="120" height="90"><p class="mt-3">' + class_details[i]['label'] + '</p></div><div class="d-flex align-items-center"><div class="confidence"><div class="confidence_level"></div></div></div></div></li>';
	}
	ui += '</ul>';
	ui += '</div>';
	
	ui += '<div class="col-3 text-center">';
	ui += '<div id="predicted_card" class="predicted_card"><div id="predicted_confidence" class="predicted_confidence">100%</div><p id="predicted_label" class="mt-3"></p><div class="text-right"><i id="btn_pair" class="fab fa-usb"></i></div></div>';
	ui += '</div>';
	
	ui += '</div>';
	ui += '</div>';
	
	var $ui = $(ui)
	$("#content").empty().append($ui);
	
	showConfidenceLevel();
	
	
	
	webCanvas = $("#webCanvas")[0];
	webCamFeed = $("#webCamFeed")[0];
    ctx = webCanvas.getContext('2d');
	//console.log(numberOfClasses);
	var image = new Image();
	image.id = "pic"
	image.src = webCanvas.toDataURL();
	//console.log("selected_number_of_classes: " + selected_number_of_classes);
 	var classifier = featureExtractor.classification(image, { numLabels: parseInt(selected_number_of_classes) });
	
	var constraints = { audio: false, video: { width: 420, height: 315 } }; 
	navigator.mediaDevices.getUserMedia(constraints)
		.then(function(mediaStream) {
  			
  			webCamFeed.srcObject = mediaStream;
  			webCamFeed.onloadedmetadata = function(e) {
    			webCamFeed.play();
  			};
		})
		.catch(function(err) { console.log(err.name + ": " + err.message); }); // always check for errors at the end.
	
	$ui.find('button[name=btn_cap]').on("click", function() {
		console.log("cap video");
		ctx.drawImage(webCamFeed, 0,0, webCanvas.width, webCanvas.height);	
	})
	
	$ui.find('select[name=prediction_frequency]').on("change", function() {
		prediction_sampling_rate = parseInt($(this).val());
	})
	
	for (var i = 0; i < class_details.length;  i++) {
		$("#card_" + i).find('.cat_card').css({
			'border' : 'solid 4px ' + class_details[i]['color']
		});
		$("#card_" + i).find('button').on("click", function() {
			console.log("Add image to this cat");
			$("#system_messages").html('<p>Remember to TRAIN your model again after adding new images :)</p>');
			ctx.drawImage(webCamFeed, 0,0, webCanvas.width, webCanvas.height);	
			var img_url  = webCanvas.toDataURL("image/png");
			$(this).parent().parent().find('img').on("load", function() {
				classifier.addImage($(this)[0], card_details['label'], function() {console.log("added image as " + card_details['label'])});
			});
			$(this).parent().parent().find('img').attr('src' , img_url);
			var card_details = $(this).data();
			card_details['number_of_samples']++;
			//console.log(card_details);
			$(this).parent().find('p').html($(this).data()['number_of_samples']);

			
		}).data(class_details[i]);	
	}
	
	$ui.find("button[name=btn_train]").on("click", function() {
		console.log("Train model");
		$(".predict_group").css('visibility', 'hidden');
		$("button").prop('disabled', true).css('opacity', 0.4);

		$("#system_messages").html('<p>Prepareing to train</p>');
		classifier.train(function(lossValue) {
			if (lossValue) {
				loss = lossValue;
				//console.log(loss);
				$("#system_messages").html('<p>Training... <br>Loss: ' + loss + '</p>');
			} else {
				//console.log('Done Training! Final Loss: ' + loss);
				$("#system_messages").html('<p>TRAINING COMPLETED <br>Loss: ' + loss + '</p>');
				$(".predict_group").css('visibility', 'visible');
				$("button").prop('disabled', false).css('opacity', 1);
			}
		});
	});
	
	$ui.find("button[name=btn_predict]").on("click", function() {
		console.log("Predict model");
		if ($ui.find("button[name=btn_predict]").data()['predicting_loop']) {
			$ui.find("button[name=btn_predict]").data()['predicting_loop'] = false;
			$ui.find("button[name=btn_predict]").html("PREDICT");
		} else {
			if (continous_predicting) {
				$ui.find("button[name=btn_predict]").data({'predicting_loop' : true});
			}
			predict();
		}
		
	});
	
	$ui.find("input[name=input_predict_always_on]").on("change", function() {
		if ($(this).is(":checked")) {
			continous_predicting = true;
		} else {
			continous_predicting = false;
		}
	})
	
	$("#btn_pair").on("click", function() {
		console.log("Pair with microbit");
		connectToMB();
	})
	
	function predict() {
		
		if ((continous_predicting == true && $ui.find("button[name=btn_predict]").data()['predicting_loop']) || continous_predicting == false) {
			var img = new Image();
			ctx.drawImage(webCamFeed, 0,0, webCanvas.width, webCanvas.height);	
			img.onload = function(){
				ctx.drawImage(img, 0, 0)
				classifier.classify(img, function(err, results) {
					if (err) {
						console.error(err);
					}
					if (results && results[0]) {
						//console.log(results);
						//console.log(results[0].label);
						//console.log(results[0].confidence);
						informMicrobit(results)
						showConfidenceLevel(results);
						
					}
					
					if ($ui.find("button[name=btn_predict]").data()['predicting_loop']) {
						$ui.find("button[name=btn_predict]").html("STOP");
						setTimeout(predict, prediction_sampling_rate);
					}
				})
			}
			
			img.src = webCanvas.toDataURL("image/png");
		}
	}
	
	function informMicrobit(predictionResults) {
		
		if (microbit_paired) {
			//console.log("Post to mb");
			window.daplink.serialWrite("$" + predictionResults[0]['label']);
		}
	}
	
	function showConfidenceLevel (predictionResults) {
		var predictionResults =  (predictionResults) ? predictionResults : [];
		
		var results_to_html = '<p>';
		for (var n = 0; n < predictionResults.length; n++) {
			results_to_html += predictionResults[n]['label'] + ' : ' + predictionResults[n]['confidence'] + '<br>';
		}
		results_to_html += '</p>';
		$("#system_messages").html(results_to_html);
		
		for (var i = 0; i < class_details.length;  i++) {
			var $currentCardConfidence = $("#card_" + i).find('.confidence_level');
			$currentCardConfidence.css({
				'background-color' : class_details[i]['color'],
				'width' : 0
			})
			for (var n = 0; n < predictionResults.length; n++) {
				if (class_details[i]['label'] == predictionResults[n]['label']) {
					var conf = Math.round(predictionResults[n]['confidence'] * 100);
					$currentCardConfidence.css({
						'width' : conf + "%"
					})
					
					if (n == 0) {
						
						$("#predicted_card").css({
							'border' : 'solid 4px ' + class_details[i]['color'],
							'visibility' : 'visible'
						});
						$("#predicted_label").html(class_details[i]['label']);
						$("#predicted_confidence").css({
							'background-color' : class_details[i]['color']
						}).html(conf + "%");
					
					}
				}
			}
		}
	}
}

function connectToMB() {
	console.log("connect to m:b");
	navigator.usb.requestDevice({
		filters: [{vendorId: 0xD28}]
	})
	.then(device => {
	
		// Connect to device
		window.transport = new DAPjs.WebUSB(device);
		window.daplink = new DAPjs.DAPLink(window.transport);
			   
		window.daplink.connect()
		.then(() => {
				return window.daplink.setSerialBaudrate(115200);
		})
		.then(() => {
			return window.daplink.getSerialBaudrate();
		})
		.then(baud => {
	
			window.daplink.startSerialRead(200);
			console.log(`Listening at ${baud} baud...`);
			$("#system_messages").html('<p>Micro:bit connected.... </p>');
			microbit_paired = true;
			window.daplink.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, data => {
				var message = data;
				//console.log(message);
				if (message.includes("[") && message.includes("]") ) {
					var trimData = message.trim();
					//console.log("data received: " + trimData);
					//console.log(trimData);
					//console.log(trimData.length);


					//$("#microbit_data").prepend('<div>' + trimData + '</div>');
					

				}
			});    
		})
		.catch(e => {
			 // If micro:bit does not support dapjs
		});
	});
}
