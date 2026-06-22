import { IsString, IsIn } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @IsIn(['free', 'starter', 'pro'])
  plan: string;
}
