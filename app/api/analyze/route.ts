import { NextRequest } from 'next/server';
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

export async function POST(req: NextRequest) {
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
          content: `당신은 생물 분류 전문가입니다. 사용자가 제공한 이미지를 분석하여 정보를 제공하세요.
반드시 다음 JSON 스키마로만 응답하세요. 마크다운이나 추가 설명은 절대 포함하지 마세요.

{
  "top1": {
    "name_ko": "한국어 이름",
    "name_en": "영어 이름",
    "confidence": 0.0~1.0 사이의 숫자,
    "rationale_points": ["근거1", "근거2", "근거3"]
  },
  "warnings": ["주의사항1", "주의사항2"]
}

- 확신이 낮으면 구체적인 종 대신 상위 분류군(예: "참새류")으로 답하세요.
- rationale_points는 짧고 구체적인 관찰 근거 3개여야 합니다.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `이 생물을 분석해주세요. ${hint ? `힌트: ${hint}` : ''}` },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.type};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    console.log('OpenAI raw response:', content);
    
    if (!content) {
      throw new Error('OpenAI 응답이 비어 있습니다.');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (e) {
      console.error('JSON parse error:', e, 'Content:', content);
      throw new Error('OpenAI가 올바른 JSON 형식을 반환하지 않았습니다.');
    }

    const validatedData = AnalysisSchema.parse(parsedData);

    return Response.json(validatedData);
  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
