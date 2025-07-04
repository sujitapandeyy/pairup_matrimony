import requests
import base64

with open("backend/sample.jpg", "rb") as img_file:
    b64_string = base64.b64encode(img_file.read()).decode("utf-8")

res = requests.post(
    "http://127.0.0.1:5050/detect-age",  
    json={"image": b64_string}
)

print("Status Code:", res.status_code)
print("Response:", res.json())
