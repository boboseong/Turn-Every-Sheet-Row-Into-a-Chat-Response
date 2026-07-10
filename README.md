# Turn Every Sheet Row Into a Chat Response

This web application lets you process spreadsheet rows or uploaded images with the OpenRouter API. Spreadsheet mode creates prompts from row data, while image mode applies one shared prompt to every uploaded image.

## Features

- Upload CSV, TSV, XLS, or XLSX files
- View and select rows from the uploaded file
- Create a dynamic prompt template using the headers from the CSV
- Generate a prompt for each row in the CSV
- Test the first spreadsheet row or first uploaded image with the OpenRouter API
- Process all rows in the CSV and download the results as a CSV or XLSX file
- Process multiple images with one shared prompt
- Estimate the cost of processing all rows

## How to Use

1.  **Upload a CSV file**: Drag and drop a CSV file onto the Sheet Upload Panel, or click to select a file.
2.  **Create a prompt template**: Use the headers from your CSV to create a prompt template in the PromptTemplatePanel. For example, if you have a header called "name", you can use `{{name}}` in your template.
3.  **Preview a prompt**: Select a row in the Sheet Upload Panel to preview its generated prompt. This selection is independent from the first-row test.
4.  **Test with OpenRouter**: Enter your OpenRouter API key and model, then click **Test First Row Prompt**. In image mode, click **Test First Image Prompt**.
5.  **Process all rows**: Click **Process All Rows** to run the generated prompt for all rows in your CSV.
6.  **Download results**: Once the processing is complete, you can download the results as a CSV or XLSX file.

## How to Run Locally

1.  Clone the repository:
    ```bash
    git clone https://github.com/boboseong/Turn-Every-Sheet-Row-Into-a-Chat-Response.git
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to `http://localhost:5173`.

## OpenRouter API

This application uses the [OpenRouter API](https://openrouter.ai/) to generate completions for the prompts. You will need to provide your own OpenRouter API key to use this feature.
