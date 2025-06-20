#!/bin/bash

# Fix response format issues in all controller files

echo "Fixing response format issues in controller files..."

# Course controller
sed -i 's/successResMsg(res, 201, "Course created successfully", { course })/successResMsg(res, 201, { message: "Course created successfully", course })/g' src/resources/courses/controllers/course.controller.js

sed -i 's/successResMsg(res, 200, "Course updated successfully", { course })/successResMsg(res, 200, { message: "Course updated successfully", course })/g' src/resources/courses/controllers/course.controller.js

sed -i 's/successResMsg(res, 201, "Curriculum added successfully", { modules: results })/successResMsg(res, 201, { message: "Curriculum added successfully", modules: results })/g' src/resources/courses/controllers/course.controller.js

sed -i 's/successResMsg(res, 201, "Module added successfully", { module })/successResMsg(res, 201, { message: "Module added successfully", module })/g' src/resources/courses/controllers/course.controller.js

sed -i 's/successResMsg(res, 201, "Lesson added successfully", { lesson })/successResMsg(res, 201, { message: "Lesson added successfully", lesson })/g' src/resources/courses/controllers/course.controller.js

sed -i 's/successResMsg(res, 200, "Course retrieved successfully", { course })/successResMsg(res, 200, { message: "Course retrieved successfully", course })/g' src/resources/courses/controllers/course.controller.js

sed -i 's/successResMsg(res, 201, "Successfully enrolled in course", { enrollment })/successResMsg(res, 201, { message: "Successfully enrolled in course", enrollment })/g' src/resources/courses/controllers/course.controller.js

sed -i 's/successResMsg(res, 200, "Course progress retrieved successfully", { progress })/successResMsg(res, 200, { message: "Course progress retrieved successfully", progress })/g' src/resources/courses/controllers/course.controller.js

sed -i 's/successResMsg(res, 200, "Lesson marked as complete", { progress })/successResMsg(res, 200, { message: "Lesson marked as complete", progress })/g' src/resources/courses/controllers/course.controller.js

# Prerecorded content controller
sed -i 's/successResMsg(res, 201, "Video class uploaded successfully", { videoClass })/successResMsg(res, 201, { message: "Video class uploaded successfully", videoClass })/g' src/resources/courses/controllers/prerecordedContent.controller.js

sed -i 's/successResMsg(res, 200, "Video classes retrieved successfully", { videoClasses })/successResMsg(res, 200, { message: "Video classes retrieved successfully", videoClasses })/g' src/resources/courses/controllers/prerecordedContent.controller.js

sed -i 's/successResMsg(res, 200, "Video class retrieved successfully", { videoClass })/successResMsg(res, 200, { message: "Video class retrieved successfully", videoClass })/g' src/resources/courses/controllers/prerecordedContent.controller.js

sed -i 's/successResMsg(res, 200, "Video class updated successfully", { videoClass })/successResMsg(res, 200, { message: "Video class updated successfully", videoClass })/g' src/resources/courses/controllers/prerecordedContent.controller.js

sed -i 's/successResMsg(res, 201, "Class resource uploaded successfully", { resource })/successResMsg(res, 201, { message: "Class resource uploaded successfully", resource })/g' src/resources/courses/controllers/prerecordedContent.controller.js

sed -i 's/successResMsg(res, 200, "Class resources retrieved successfully", { resources })/successResMsg(res, 200, { message: "Class resources retrieved successfully", resources })/g' src/resources/courses/controllers/prerecordedContent.controller.js

sed -i 's/successResMsg(res, 200, "Feature coming soon", { videoClasses: \[\] })/successResMsg(res, 200, { message: "Feature coming soon", videoClasses: [] })/g' src/resources/courses/controllers/prerecordedContent.controller.js

echo "Response format fixes completed!"
