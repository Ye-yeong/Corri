import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AnalysisSchema = z.object({
  top1: z.object({
    name_ko: z.string(),
    name_en: z.string(),
    confidence: z.number().min(0).max(1),
    rationale_points: z.array(z.string()).length(3),
  }),
  warnings: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다. (Vercel Environment Variables 확인)" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const hint = formData.get("hint") as string | null;

    if (!file) {
      return Response.json({ error: "이미지가 없습니다." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "파일 크기는 5MB를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    const systemPrompt = [
      "You are an expert in biological classification.",
      "Return ONLY valid JSON. No extra text, no markdown, no code blocks.",
      "All fields must be present. If unsure, still make a best guess.",
      "If there are no warnings, use an empty array for warnings.",
      "",
      "Return in this exact JSON shape (example values shown):",
      "{",
      '  "top1": {',
      '    "name_ko": "한국어 이름",',
      '    "name_en": "English name",',
      '    "confidence": 0.73,',
      '    "rationale_points": ["point 1", "point 2", "point 3"]',
      "  },",
      '  "warnings": []',
      "}",
    ].join("\n");

    const userText = `Analyze this organism in the image. ${
      hint ? `Hint category: ${hint}` : ""
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            {
              type: "image_url",
              image_url: { url: `data:${file.type};base64,${base64Image}` },
            },
          ],
        },
      ],
      temperature: 0.2,
      // ✅ response_format 쓰지 마세요. (content empty 이슈 방지)
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      // OpenAI가 content를 비우는 경우 방어
      return Response.json(
        { error: "OpenAI response is empty" },
        { status: 502 }
      );
    }

    // JSON 파싱
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse failed. Raw content:", content);
      return Response.json(
        { error: "모델 응답이 JSON 형식이 아닙니다.", raw: content },
        { status: 502 }
      );
    }

    // Zod 검증
    const validated = AnalysisSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("Zod validation failed:", validated.error.flatten());
      return Response.json(
        {
          error: "모델 응답이 스키마와 일치하지 않습니다.",
          issues: validated.error.flatten(),
        },
        { status: 502 }
      );
    }

    return Response.json(validated.data);
  } catch (error: any) {
    console.error("Analysis error:", error);
    return Response.json(
      { error: error?.message || "분석 중 오류 발생" },
      { status: 500 }
    );
  }
}
