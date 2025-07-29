# Turn Every Sheet Row Into a Chat Response

This is a simple web application that allows you to upload a CSV file, create a dynamic prompt template, and generate prompts for each row in the CSV. You can then use the OpenRouter API to test the generated prompts and process all rows in the CSV.

## Features

- Upload CSV, TSV, XLS, or XLSX files
- View and select rows from the uploaded file
- Create a dynamic prompt template using the headers from the CSV
- Generate a prompt for each row in the CSV
- Test the generated prompt with the OpenRouter API
- Process all rows in the CSV and download the results as a CSV or XLSX file
- Estimate the cost of processing all rows

## How to Use

1.  **Upload a CSV file**: Drag and drop a CSV file onto the Sheet Upload Panel, or click to select a file.
2.  **Create a prompt template**: Use the headers from your CSV to create a prompt template in the PromptTemplatePanel. For example, if you have a header called "name", you can use `{{name}}` in your template.
3.  **Generate a prompt**: Select a row in the Sheet Upload Panel to see the generated prompt in the right panel.
4.  **Test with OpenRouter**: Enter your OpenRouter API key and model in the API panel, and then click "Test" to see the API response.
5.  **Process all rows**: Click "Start Processing" to run the generated prompt for all rows in your CSV.
6.  **Download results**: Once the processing is complete, you can download the results as a CSV or XLSX file.

## How to Run Locally

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/csv-based-dynamic-prompt-generator.git
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
