export let generateQuestionsInstruction = `Give me <<numberOfQuestions>> solved MCQs based on <<board>> <<subject>> Chapter "<<ChapterName>>" in JSON format. Make sure all topics covered from the chapter. 
You are strictly instructed to generate these questions into mentioned JSON format, so that I can convert the response using JSON.parse() method and this shouldn't throw any errors.
The JSON Format should be - 

[
  {
    question: "Question", 
    options: ["Opt1", "Opt2", "Opt3", "Opt4"], 

    correct: "Opt3", 
    explaination: "Explaination"
  }, 
  // Other questions...
]`


export let corruptJSONFix = `You have a corrupted JSON data and data and you have to fix it. 
Don't talk too much. Just give me the fixed JSON data. 
So that I can easily parse the JSON data using JSON.parse() method without any errors. The corrupted data was mentioned below.

`