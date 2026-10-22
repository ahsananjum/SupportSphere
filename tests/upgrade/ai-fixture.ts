import { fixture, checked } from './fixture';
import { indexedSource, syntheticVector } from './knowledge-fixture';
import {
  createAiProcessor,
  type Job,
} from '../../supabase/functions/_shared/ai-processor';

export async function aiFixture() {
  const f = await fixture();
  try {
    const owner = await f.actor('ai-boundary-owner'),
      workspace = await f.workspace(owner);
    const source = await indexedSource(f.admin, owner.client, workspace);
    const customer = checked(
      await owner.client.rpc('create_or_get_customer', {
        p_workspace_id: workspace,
        p_name: 'Policy boundary',
        p_email: 'boundary@example.invalid',
        p_phone: '',
        p_company: '',
        p_provider: 'manual',
        p_identity_key: '',
      }),
    );
    const process = createAiProcessor(
      f.admin as unknown as Parameters<typeof createAiProcessor>[0],
      { run: async () => syntheticVector },
    );
    const policy = async (mode: string) =>
      checked(
        await owner.client.rpc('update_ai_config', {
          p_workspace_id: workspace,
          p_mode: mode,
          p_tone: 'Clear and helpful',
          p_confidence: 0.85,
          p_evidence: 0.75,
          p_custom_instructions: 'Answer from cited evidence.',
          p_excluded_intents: [
            'billing',
            'security',
            'privacy',
            'legal',
            'account_change',
          ],
        }),
      );
    async function start(mode = 'assisted', text = 'How do I export a PDF?') {
      await policy(mode);
      const c = checked(
        await owner.client.rpc('create_conversation', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_subject: 'Bounded AI policy test',
          p_channel: 'manual',
        }),
      ) as string;
      checked(
        await f.admin.from('messages').insert({
          workspace_id: workspace,
          conversation_id: c,
          sender_type: 'customer',
          body: text,
        }),
      );
      const runs = checked(
        await f.admin.from('ai_runs').select('*').eq('conversation_id', c),
      );
      if (mode === 'off') {
        if (runs.length) throw Error('Off unexpectedly enqueued');
        return { c, job: null };
      }
      const job = checked(await f.admin.rpc('claim_ai_run')) as Job;
      if (!job || job.conversation_id !== c)
        throw Error(
          'Unexpected pending AI work; stop instead of processing another conversation',
        );
      return { c, job };
    }
    const state = async (c: string) => ({
      run: checked(
        await f.admin
          .from('ai_runs')
          .select('*')
          .eq('conversation_id', c)
          .single(),
      ),
      sends: checked(
        await f.admin
          .from('messages')
          .select('id,body,sender_type,client_id')
          .eq('conversation_id', c)
          .eq('sender_type', 'agent'),
      ),
    });
    const processJob = (job: Job, provider: unknown) =>
      process(job, provider as never, {
        triage: 'controlled-local',
        support: 'controlled-local',
        quality: 'controlled-local',
      });
    return {
      ...f,
      createWorkspace: f.workspace,
      owner,
      workspace,
      source,
      policy,
      start,
      state,
      processJob,
    };
  } catch (error) {
    await f.cleanup();
    throw error;
  }
}

export function controlledProvider(
  options: {
    confidence?: number;
    unsafe?: boolean;
    qualityFail?: boolean;
    badCitations?: boolean;
    beforeFinish?: () => Promise<unknown>;
    fail?: () => never;
  } = {},
) {
  const calls = { triage: 0, draft: 0, quality: 0 };
  const response = <T>(value: T) => ({
    value,
    usage: { input_tokens: 1, output_tokens: 1 },
  });
  const provider = {
    triage: async () => {
      calls.triage++;
      options.fail?.();
      return response({
        intent: 'how_to',
        priority: 'normal',
        sentiment: 'neutral',
        language: 'en',
        escalate: false,
        confidence: options.confidence ?? 0.99,
        summary: 'Export question',
        tags: [],
      });
    },
    draft: async () => {
      calls.draft++;
      return response({
        answer: 'Open Settings, Reports and Export PDF [1].',
        citation_ordinals: options.badCitations ? [9] : [1],
        confidence: 0.99,
      });
    },
    quality: async () => {
      calls.quality++;
      await options.beforeFinish?.();
      return response({
        passed: !options.qualityFail,
        grounded: true,
        safe: !options.unsafe,
        tone_ok: true,
        reason: 'Controlled check',
        confidence: 0.99,
      });
    },
  };
  return { provider, calls };
}
