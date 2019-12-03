import cv2
import json
import math
import numpy as np
import matplotlib.pyplot as plt

def draw_matches(img1, kp1, img2, kp2, matches, color=None): 
    """Draws lines between matching keypoints of two images.  
    Keypoints not in a matching pair are not drawn.
    Places the images side by side in a new image and draws circles 
    around each keypoint, with line segments connecting matching pairs.
    You can tweak the r, thickness, and figsize values as needed.
    Args:
        img1: An openCV image ndarray in a grayscale or color format.
        kp1: A list of cv2.KeyPoint objects for img1.
        img2: An openCV image ndarray of the same format and with the same 
        element type as img1.
        kp2: A list of cv2.KeyPoint objects for img2.
        matches: A list of DMatch objects whose trainIdx attribute refers to 
        img1 keypoints and whose queryIdx attribute refers to img2 keypoints.
        color: The color of the circles and connecting lines drawn on the images.  
        A 3-tuple for color images, a scalar for grayscale images.  If None, these
        values are randomly generated.  
    """
    # We're drawing them side by side.  Get dimensions accordingly.
    # Handle both color and grayscale images.
    if len(img1.shape) == 3:
        new_shape = (max(img1.shape[0], img2.shape[0]), img1.shape[1]+img2.shape[1], img1.shape[2])
    elif len(img1.shape) == 2:
        new_shape = (max(img1.shape[0], img2.shape[0]), img1.shape[1]+img2.shape[1])
    new_img = np.zeros(new_shape, type(img1.flat[0]))  
    # Place images onto the new image.
    new_img[0:img1.shape[0],0:img1.shape[1]] = img1
    new_img[0:img2.shape[0],img1.shape[1]:img1.shape[1]+img2.shape[1]] = img2
    
    # Draw lines between matches.  Make sure to offset kp coords in second image appropriately.
    r = 15
    thickness = 2
    if color:
        c = color
    for m in matches:
        # Generate random color for RGB/BGR and grayscale images as needed.
        if not color: 
            c = np.random.randint(0,256,3) if len(img1.shape) == 3 else np.random.randint(0,256)
        # So the keypoint locs are stored as a tuple of floats.  cv2.line(), like most other things,
        # wants locs as a tuple of ints.
        end1 = tuple(np.round(kp1[m.trainIdx].pt).astype(int))
        end2 = tuple(np.round(kp2[m.queryIdx].pt).astype(int) + np.array([img1.shape[1], 0]))
        cv2.line(new_img, end1, end2, c, thickness)
        cv2.circle(new_img, end1, r, c, thickness)
        cv2.circle(new_img, end2, r, c, thickness)
    
    plt.figure(figsize=(15,15))
    plt.imshow(new_img)
    plt.show()


class Match:
	def __init__(self, x, y, dist):
		self.trainIdx = x
		self.queryIdx = y
		self.distance = dist

# Detect keypoints on both images

PATCH_SIZE = 48
KERNEL_SIZE = 9
use_orientation = True

byteLength = 32

img1 = cv2.imread('./1.jpg', 0)
img2 = cv2.imread('./3.jpg', 0)

img1 = cv2.resize(img1, (640, 480))
img2 = cv2.resize(img2, (640, 480))

img1 = cv2.blur(img1, (5, 5))
img2 = cv2.blur(img2, (5, 5))

## In ORB paper they use radius = patch_Size 
def getMomentum(img, x, y, p, q):
	momentum = 0
	area = int(PATCH_SIZE / 2)

	for i in range(-area, area):
		for j in range(-area, area):
			momentum = momentum + math.pow(i, p) * math.pow(j, q) * img[y + j, x + i]

	return momentum


def getKeypointOrientation(img, x, y):
	return math.atan2(getMomentum(img, x, y, 1, 0), getMomentum(img, x, y, 0, 1))


def smoothedCompare(img, centroid, a, b, angle):
	if SMOOTHED(img, centroid, (a["x"], a["y"]), angle) < SMOOTHED(img, centroid, (b["x"], b["y"]), angle):
		return 1
	else:
		return 0


def SMOOTHED(img, centroid, offset, angle):
	HALF_KERNEL = 4
	
	offsetX = offset[0]
	offsetY = offset[1]

	x = centroid[0]
	y = centroid[1]
	
	if use_orientation:
		angle = angle * math.pi / 180.0
		angle = -angle
		R = [math.sin(angle), math.cos(angle)]

		rx = (int)(offsetX * R[1] - offsetY * R[0])
		ry = (int)(offsetX * R[0] + offsetY * R[1])
		if(rx > 24):
			rx = 24
		if(rx < -24):
			rx = -24
		if(ry > 24):
			ry = 24
		if(ry < -24):
			ry = -24
		offsetX = rx
		offsetY = ry

	offsetX += int(x)
	offsetY += int(y)


	# sum = int(img[offsetX + HALF_KERNEL + 1, offsetY + HALF_KERNEL + 1]) + int(img[offsetX - HALF_KERNEL, offsetY - HALF_KERNEL]) + int(img[offsetX - HALF_KERNEL, offsetY + HALF_KERNEL + 1]) + int(img[offsetX + HALF_KERNEL + 1, offsetY - HALF_KERNEL])
	# return int(sum / 4)
	return int(img[offsetY + HALF_KERNEL + 1, offsetX + HALF_KERNEL + 1]) \
		+ int(img[offsetY - HALF_KERNEL, offsetX - HALF_KERNEL]) 	\
		- int(img[offsetY + HALF_KERNEL + 1, offsetX - HALF_KERNEL]) 	\
		- int(img[offsetY - HALF_KERNEL, offsetX + HALF_KERNEL + 1])
	#return img[offsetX, offsetY]

def getDescriptor(img, x, y):
	if(use_orientation):
		angle = getKeypointOrientation(img, x, y)
	else:
		angle = 0

	descriptors = []
	for line in data["data"]:
		desc = 0
		power_2 = 7
		for pair in line:
			desc = desc + (smoothedCompare(img, (x, y), pair[0], pair[1], angle) << power_2)
			power_2 = power_2 - 1
		descriptors.append(desc)

	return descriptors

def hammingDist(v1, v2):
	dist = 0
	for i in range(0, len(v1)):
		el1 = v1[i]
		el2 = v2[i]
		while(el1 > 0 or el2 > 0):
			if(el1 % 2 != el2 % 2):
				dist += 1
			el1 = int(el1 / 2)
			el2 = int(el2 / 2)
	return dist 

with open('gen_32.json') as json_file:
	data = json.load(json_file)



orb = cv2.ORB_create()
kp1 = orb.detect(img1, None)
kp2 = orb.detect(img2, None)

des1 = []
des2 = []

print(len(kp1))
for i in range(0, len(kp1)):
	if(len(kp1[i].pt) != 2): continue
	x = kp1[i].pt[0]
	y = kp1[i].pt[1]
	if(x - PATCH_SIZE / 2 - KERNEL_SIZE / 2 < 0): continue
	if(y - PATCH_SIZE / 2 - KERNEL_SIZE / 2 < 0): continue
	if(x + PATCH_SIZE / 2 + KERNEL_SIZE / 2 > img1.shape[1]): continue
	if(y + PATCH_SIZE / 2 + KERNEL_SIZE / 2 > img1.shape[0]): continue

	des1.append(getDescriptor(img1, int(x), int(y)))


print(len(kp2))
for i in range(0, len(kp2)):
	if(len(kp2[i].pt) != 2): continue
	x = kp2[i].pt[0]
	y = kp2[i].pt[1]
	if(x - PATCH_SIZE / 2 - KERNEL_SIZE / 2 < 0): continue
	if(y - PATCH_SIZE / 2 - KERNEL_SIZE / 2 < 0): continue
	if(x + PATCH_SIZE / 2 + KERNEL_SIZE / 2 > img2.shape[1]): continue
	if(y + PATCH_SIZE / 2 + KERNEL_SIZE / 2 > img2.shape[0]): continue

	des2.append(getDescriptor(img2, int(x), int(y)))

print("Calculating matches...")
matches = []
for i in range(0, len(des1)):
	minDist = 10000
	minDistIdx = 0
	for j in range(0, len(des2)):
		dist = hammingDist(des1[i], des2[j])
		if minDist > dist:
			minDist = dist
			minDistIdx = j
	matches.append(Match(i, minDistIdx, minDist))

matches.sort(key = lambda m : m.distance)

draw_matches(img1, kp1, img2, kp2, matches[:30])
