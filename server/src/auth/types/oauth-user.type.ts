export interface OAuthUser {
  providerId: string;
  provider: string;
  email: string;
  // Provider profilida email tasdiqlangan (verified) deb kelganmi. Faqat
  // shu true bo'lsa mavjud hisobni email bo'yicha avtomatik bog'lash mumkin —
  // aks holda birov boshqasining emailini o'ziga (tasdiqlanmagan holda)
  // qo'shib, uning hisobini egallab olishi mumkin edi.
  emailVerified: boolean;
  name?: string;
  avatar?: string | null;
}

export type OAuthDoneCallback = (err: Error | null, user?: OAuthUser) => void;
