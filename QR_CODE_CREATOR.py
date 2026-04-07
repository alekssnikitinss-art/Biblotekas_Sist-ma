import qrcode

qr = qrcode.QRCode(
    version=1,
    box_size=10,
    border=5
)

qr.add_data("https://docs.google.com/presentation/d/1c4AWfL1QofjdbSoNTTHaJ2YLcKasWTlTJDPQWu3t8GE/edit?usp=drive_link")
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("TEST_qr.png")