import {
  buildSpeechParagraphs,
  estimateSpeechMinutes,
} from '../src/screens/ArticleDetail/speechText';

describe('speech text preparation', () => {
  it('keeps the title and separates article paragraphs', () => {
    expect(
      buildSpeechParagraphs(
        'Bản tin sáng',
        'Những điểm đáng chú ý.',
        '<p>Nội dung thứ nhất.</p><p>Nội dung thứ hai &amp; tiếp theo.</p>'
      )
    ).toEqual([
      'Bản tin sáng',
      'Những điểm đáng chú ý.',
      'Nội dung thứ nhất.',
      'Nội dung thứ hai & tiếp theo.',
    ]);
  });

  it('removes scripts and markup before speaking', () => {
    const paragraphs = buildSpeechParagraphs(
      undefined,
      undefined,
      '<script>alert("x")</script><div>Tin <strong>quan trọng</strong>.</div>'
    );
    expect(paragraphs).toEqual(['Tin quan trọng.']);
  });

  it('always reports at least one minute', () => {
    expect(estimateSpeechMinutes(['Một đoạn ngắn.'])).toBe(1);
  });
});
