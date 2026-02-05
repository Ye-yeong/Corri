import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AnalysisSchema = z.object({
  top1: z.object({
    name_ko: z.string(),
    name_en: z.string(),
    confidence: z.number(),
    rationale_points: z.array(z.string()).length(3),
  }),
  warnings: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const hint = formData.get('hint') as string | null;

    if (!file) {
      return Response.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: '파일 크기는 5MB를 초과할 수 없습니다.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `당신은 생물 분류 전문가입니다. 사용자가 제공한 이미지를 분석하여 정보를 제공하세요. 반드시 다음 JSON 스키마로만 응답하세요.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `이 생물을 분석해주세요. ${hint ? `힌트: ${hint}` : ''}` },
            {
              type: 'image_url',
              image_url: { url: `data:${file.type};base64,${base64Image}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('OpenAI response is empty');

    const parsedData = JSON.parse(content);
    const validatedData = AnalysisSchema.parse(parsedData);

    return Response.json(validatedData);
  } catch (error: any) {
    console.error('Analysis error:', error);
    return Response.json({ error: error.message || '분석 중 오류 발생' }, { status: 500 });
  }
}