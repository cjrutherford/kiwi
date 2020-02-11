import { IsString, IsNumber, IsArray } from '../../src/index'

export class AddressModel {
    @IsString() public street: string;
    @IsNumber() public number: number;
}

export class UserModel {
    @IsNumber() public id: number;
    @IsString()  public name: string;
    @IsString()  public lastname: string;
    @IsNumber() public age: number;
    @IsArray(() => AddressModel) public address: AddressModel[];
}
