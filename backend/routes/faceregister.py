from flask import Blueprint, request, jsonify, session
import cv2
import numpy as np
import base64
import os

face_bp = Blueprint('face', __name__)

# model load
faceProto = "backend/facedetect/opencv_face_detector.pbtxt"
faceModel = "backend/facedetect/opencv_face_detector_uint8.pb"
ageProto = "backend/facedetect/age_deploy.prototxt"
ageModel = "backend/facedetect/age_net.caffemodel"

faceNet = cv2.dnn.readNet(faceModel, faceProto)
ageNet = cv2.dnn.readNet(ageModel, ageProto)

ageList = ['(0-2)', '(4-6)', '(8-12)', '(15-20)', '(25-32)',
           '(38-43)', '(48-53)', '(60-100)']
MODEL_MEAN_VALUES = (78.4263377603, 87.7689143744, 114.895847746)

def highlightFace(net, frame, conf_threshold=0.7):
    frameHeight, frameWidth = frame.shape[:2]
    blob = cv2.dnn.blobFromImage(frame, 1.0, (300, 300),
                                 [104, 117, 123], swapRB=True, crop=False)
    net.setInput(blob)
    detections = net.forward()
    faceBoxes = []
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence > conf_threshold:
            x1 = int(detections[0, 0, i, 3] * frameWidth)
            y1 = int(detections[0, 0, i, 4] * frameHeight)
            x2 = int(detections[0, 0, i, 5] * frameWidth)
            y2 = int(detections[0, 0, i, 6] * frameHeight)
            faceBoxes.append([x1, y1, x2, y2])
    return faceBoxes

@face_bp.route('/detect-age', methods=['POST'])
def detect_age():
    try:
        data = request.json
        img_data = base64.b64decode(data['image'])
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        faceBoxes = highlightFace(faceNet, frame)
        if not faceBoxes:
            return jsonify({"success": False, "message": "No face detected."}), 400

        results = []
        for faceBox in faceBoxes:
            face = frame[max(0, faceBox[1]-20):min(faceBox[3]+20, frame.shape[0]-1),
                         max(0, faceBox[0]-20):min(faceBox[2]+20, frame.shape[1]-1)]

            blob = cv2.dnn.blobFromImage(face, 1.0, (227, 227),
                                         MODEL_MEAN_VALUES, swapRB=False)
            ageNet.setInput(blob)
            agePreds = ageNet.forward()
            age_label = ageList[agePreds[0].argmax()]
            min_age = int(age_label[1:].split('-')[0])

            if min_age < 18:
                return jsonify({
                    "success": False,
                    "message": "Age restriction: Must be 18 or older.",
                    "detected_age": age_label
                }), 403

            session['verified_age'] = min_age
            results.append({
                "age_range": age_label,
                "min_age": min_age
            })

        return jsonify({
            "success": True,
            "message": "Age accepted.",
            "data": results
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Error processing image.",
            "error": str(e)
        }), 500
