import { apiClient } from "../../../shared/api/client";
export type Coupon={id:number;title:string;code:string;description:string;businessName:string;category:string;discountText:string;imageUrl?:string|null;terms?:string|null;status:string;startDate:string;endDate:string};
export type CouponList={items:Coupon[];totalCount:number;page:number;pageSize:number};
export async function getCoupons(search="",page=1,pageSize=9,category=""){return (await apiClient.get<CouponList>("/coupons",{params:{search:search||undefined,category:category||undefined,page,pageSize}})).data}
