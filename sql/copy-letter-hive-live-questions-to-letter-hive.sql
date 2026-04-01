-- Copy active championship letter hive questions into the regular letter hive table.
-- Safe to re-run: existing normalized questions for the same letter are skipped.

begin;

insert into public.letter_hive_questions (letter, question, answer)
select source.letter, source.question, source.answer
from public.letter_hive_live_questions as source
where source.is_active = true
  and not exists (
    select 1
    from public.letter_hive_questions as target
    where target.letter = source.letter
      and lower(regexp_replace(btrim(target.question), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(source.question), '\s+', ' ', 'g'))
  );

commit;