import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// JSON schema for the extracted program (matches the app's data model)
const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'extract_program',
  description: 'Extract a structured workout program from the PDF document.',
  input_schema: {
    type: 'object' as const,
    required: ['name', 'days'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', description: 'Program name' },
      days: {
        type: 'array',
        items: {
          type: 'object',
          required: ['dayIndex', 'label', 'exercises'],
          additionalProperties: false,
          properties: {
            dayIndex: {
              type: 'integer',
              description: '0=Monday … 6=Sunday',
            },
            label: { type: 'string', description: 'Day label, e.g. "Giorno A"' },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'notes', 'restSeconds', 'weeks'],
                additionalProperties: false,
                properties: {
                  name: { type: 'string' },
                  notes: { type: 'string', description: 'Empty string if none' },
                  restSeconds: {
                    type: 'integer',
                    description: 'Rest between sets in seconds. Default 90 if not specified.',
                  },
                  weeks: {
                    type: 'array',
                    description: 'Weekly progression. At least one entry for week 1.',
                    items: {
                      type: 'object',
                      required: ['weekNumber', 'setCount', 'targetReps', 'targetWeight'],
                      additionalProperties: false,
                      properties: {
                        weekNumber: { type: 'integer', minimum: 1 },
                        setCount: { type: 'integer', minimum: 1 },
                        targetReps: { type: 'integer', minimum: 1 },
                        targetWeight: {
                          type: 'number',
                          description: 'Target weight in kg. 0 if bodyweight or unspecified.',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Provide a PDF file.' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_program' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as Anthropic.DocumentBlockParam,
            {
              type: 'text',
              text: `Extract the complete workout program from this PDF.

Rules:
- dayIndex: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
- If days are labeled "Giorno A/B/C" without days of week, assign them starting from Monday (0, 1, 2, …)
- restSeconds: convert rest time to seconds (e.g. "2 min" → 120). Default to 90 if not specified.
- weeks: if the program has no weekly progression, create a single week 1 entry with the given sets/reps.
- targetWeight: use 0 for bodyweight exercises or when weight is not specified.
- Extract ALL exercises from ALL training days.`,
            },
          ],
        },
      ],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    if (!toolUse) {
      return NextResponse.json({ error: 'Claude did not return structured data.' }, { status: 500 })
    }

    return NextResponse.json(toolUse.input)
  } catch (err) {
    const message = err instanceof Anthropic.APIError ? err.message : 'Internal server error'
    console.error('[import-pdf]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
