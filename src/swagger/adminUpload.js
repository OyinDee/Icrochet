/**
 * @swagger
 * /admin/upload/image:
 *   post:
 *     tags: [Admin Upload]
 *     summary: Upload single image
 *     description: Upload a single image file to Cloudinary
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (JPEG, PNG, WebP)
 *               folder:
 *                 type: string
 *                 example: "items"
 *                 description: Optional folder name in Cloudinary
 *               transformation:
 *                 type: string
 *                 example: "w_800,h_600,c_fill"
 *                 description: Optional Cloudinary transformation parameters
 *             required:
 *               - image
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                           format: uri
 *                           example: "https://res.cloudinary.com/demo/image/upload/v1234567890/items/sample.jpg"
 *                         publicId:
 *                           type: string
 *                           example: "items/sample"
 *                         width:
 *                           type: integer
 *                           example: 800
 *                         height:
 *                           type: integer
 *                           example: 600
 *                         format:
 *                           type: string
 *                           example: "jpg"
 *                         bytes:
 *                           type: integer
 *                           example: 245760
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Invalid file or upload error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               noFile:
 *                 summary: No file provided
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "NO_FILE_PROVIDED"
 *                     message: "No image file provided"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               invalidFormat:
 *                 summary: Invalid file format
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_FILE_FORMAT"
 *                     message: "Only JPEG, PNG, and WebP images are allowed"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               fileTooLarge:
 *                 summary: File too large
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "FILE_TOO_LARGE"
 *                     message: "File size must be less than 10MB"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Upload service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/upload/images:
 *   post:
 *     tags: [Admin Upload]
 *     summary: Upload multiple images
 *     description: Upload multiple image files to Cloudinary
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of image files to upload (max 10 files)
 *               folder:
 *                 type: string
 *                 example: "items"
 *                 description: Optional folder name in Cloudinary
 *               transformation:
 *                 type: string
 *                 example: "w_800,h_600,c_fill"
 *                 description: Optional Cloudinary transformation parameters
 *             required:
 *               - images
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         images:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               url:
 *                                 type: string
 *                                 format: uri
 *                               publicId:
 *                                 type: string
 *                               width:
 *                                 type: integer
 *                               height:
 *                                 type: integer
 *                               format:
 *                                 type: string
 *                               bytes:
 *                                 type: integer
 *                         uploaded:
 *                           type: integer
 *                           example: 3
 *                         failed:
 *                           type: integer
 *                           example: 0
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               filename:
 *                                 type: string
 *                               error:
 *                                 type: string
 *       400:
 *         description: Invalid files or upload error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/upload/delete:
 *   delete:
 *     tags: [Admin Upload]
 *     summary: Delete image from Cloudinary
 *     description: Delete an image from Cloudinary using its public ID
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               publicId:
 *                 type: string
 *                 example: "items/sample"
 *                 description: Cloudinary public ID of the image to delete
 *             required:
 *               - publicId
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         publicId:
 *                           type: string
 *                           example: "items/sample"
 *                         result:
 *                           type: string
 *                           example: "ok"
 *       400:
 *         description: Invalid public ID or deletion error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /admin/upload/transform:
 *   post:
 *     tags: [Admin Upload]
 *     summary: Transform existing image
 *     description: Apply transformations to an existing Cloudinary image
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               publicId:
 *                 type: string
 *                 example: "items/sample"
 *                 description: Cloudinary public ID of the image to transform
 *               transformation:
 *                 type: string
 *                 example: "w_400,h_300,c_fill,q_auto"
 *                 description: Cloudinary transformation parameters
 *               format:
 *                 type: string
 *                 enum: [jpg, png, webp, auto]
 *                 example: "webp"
 *                 description: Output format for the transformed image
 *             required:
 *               - publicId
 *               - transformation
 *     responses:
 *       200:
 *         description: Image transformed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         originalUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://res.cloudinary.com/demo/image/upload/items/sample.jpg"
 *                         transformedUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://res.cloudinary.com/demo/image/upload/w_400,h_300,c_fill,q_auto/items/sample.webp"
 *                         publicId:
 *                           type: string
 *                           example: "items/sample"
 *                         transformation:
 *                           type: string
 *                           example: "w_400,h_300,c_fill,q_auto"
 *       400:
 *         description: Invalid transformation parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */