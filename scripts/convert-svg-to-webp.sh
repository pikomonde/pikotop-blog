#!/bin/bash

# 1. Validate if the user provided a file argument
if [ -z "$1" ]; then
    echo "Error: Please provide an SVG file!"
    echo "Usage: ./convert.sh filename.svg"
    exit 1
fi

# 2. Get the input filename from the first argument
INPUT_FILE="$1"

# 3. Extract the filename without the .svg extension (e.g., "image.svg" -> "image")
FILENAME="${INPUT_FILE%.svg}"

# 4. Define the output WebP filename
OUTPUT_FILE="${FILENAME}.webp"

# 5. Run the conversion pipeline
echo "Converting $INPUT_FILE to $OUTPUT_FILE..."
rsvg-convert --dpi-x=300 --dpi-y=300 -f png "$INPUT_FILE" | cwebp -q 80 -o "$OUTPUT_FILE" -- -

# 6. Check if the conversion was successful
if [ $? -eq 0 ]; then
    echo "✅ Success! File saved as: $OUTPUT_FILE"
else
    echo "❌ Error: Conversion failed."
fi
