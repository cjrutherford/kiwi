import { Get, Post, JsonController, Param, Body, QueryParam, Authorize } from '../src/index';
import {Utils} from './utils';

@Authorize(['role1, role2'])
@JsonController('/testcontroller')
export class TestController {
    
    constructor(private utils: Utils){}
    
    @Post('/meetupjs')
    public test23(@Body() body: any){
        return body;
    }

    @Get('/queryparam/:id')
    public queryparam(@QueryParam() object: any, @Param('id') id: string){
        this.utils.print();
        return object;
    }

    @Get('/octobot/:name')
    public get2(@Param('name') name: string){
        return {test: name};
    }

    @Get('/getAction/:id/:id2/:id3')
    public get(@Param('id3') id: string, @Param('id2') id2: string, @Param('id') id3: string) {
        return "get test";
    }

    @Get('/getActionWithoutParam')
    public getActionWithoutParam() {
        return "get without params test";
    }

    @Post('/postAction/:id')
    public post( @Body() request: any, @Param('id') id: string) {
        return {
            method: "post test",
            request: request
        };
    }

    @Get('/postAction/:id')
    public getSame(@Param('id') id: string) {
        return {
            method: "get same url post test",
        };
    }
}