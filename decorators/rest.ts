
import * as express from 'express';

const app = express();
app.use(express.json());

const port = 3000;

export function Rest(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = propertyKey;

    let httpMethod: 'get' | 'post' | 'delete' = 'get';
    let route = `/api/${methodName}`;

    if (methodName.startsWith('add') || methodName.startsWith('update')) {
        httpMethod = 'post';
        route = `/api/${methodName.replace(/^(add|update)/, '').toLowerCase()}`;
    } else if (methodName.startsWith('delete') || methodName.startsWith('remove')) {
        httpMethod = 'delete';
        route = `/api/${methodName.replace(/^(delete|remove)/, '').toLowerCase()}`;
    } else if (methodName.startsWith('get')) {
        route = `/api/${methodName.replace(/^get/, '').toLowerCase()}`;
    }


    app[httpMethod](route, async (req: express.Request, res: express.Response) => {
        try {
            let args: any[];
            if (httpMethod === 'get') {
                args = Object.values(req.query);
            } else {
                args = req.body ? Object.values(req.body) : [];
            }
            const result = await originalMethod.apply(target, args);
            res.json(result);
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    return descriptor;
}

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
