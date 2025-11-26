import genAI from "./gemini";

const query = async (prompt: string, id: string, model: string) => {
  try {
    if (!model) model = "gemini-2.5-flash";

    const aiModel = genAI.getGenerativeModel({ model });

    const result = await aiModel.generateContent([{ text: prompt }]);

    return result.response.text();
  } catch (err: any) {
    console.error("QUERY ERROR:", err);
    return "Sorry, I could not generate a response.";
  }
};

export default query;
